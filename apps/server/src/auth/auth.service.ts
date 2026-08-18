import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthClient } from '@app/shared';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async findOrCreateByWx(args: {
    provider: 'wx-miniapp' | 'wx-web';
    openid: string;
    unionid?: string;
    nickname?: string;
    avatarUrl?: string;
  }): Promise<{ id: string; displayName: string; avatarUrl: string | null; email: string | null }> {
    const externalId = args.unionid ?? args.openid;
    const existing = await this.prisma.userAuth.findUnique({
      where: { provider_externalId: { provider: args.provider, externalId } },
      include: { user: true },
    });
    if (existing) {
      return {
        id: existing.user.id,
        displayName: existing.user.displayName,
        avatarUrl: existing.user.avatarUrl,
        email: existing.user.email,
      };
    }
    const user = await this.prisma.user.create({
      data: {
        displayName: args.nickname ?? `用户${Math.random().toString(36).slice(2, 8)}`,
        avatarUrl: args.avatarUrl ?? null,
        auths: {
          create: { provider: args.provider, externalId },
        },
      },
    });
    return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, email: user.email };
  }

  async registerByEmail(email: string, password: string, displayName: string) {
    const hash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: hash,
        auths: { create: { provider: 'email', externalId: email } },
      },
    });
    return this.issueTokens(user.id, AuthClient.Web);
  }

  async loginByEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return null;
    }
    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) return null;
    return { user, tokens: await this.issueTokens(user.id, AuthClient.Web) };
  }

  async issueTokens(userId: string, client: AuthClient) {
    const accessSecret = this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtlSeconds = this.parseTtlSeconds(this.config.get<string>('JWT_REFRESH_TTL') ?? '30d');

    const accessToken = await this.jwt.signAsync(
      { sub: userId, client },
      { secret: accessSecret, expiresIn: accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, client, jti: `${Date.now()}-${Math.random().toString(36).slice(2, 12)}` },
      { secret: refreshSecret, expiresIn: refreshTtlSeconds },
    );
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        client,
        expiresAt,
      },
    });
    return { accessToken, refreshToken, expiresIn: refreshTtlSeconds };
  }

  async refresh(refreshToken: string) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret';
    let payload: { sub: string; client: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; client: string }>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      return null;
    }
    const tokenHash = this.hashToken(refreshToken);
    const rec = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!rec || rec.revokedAt || rec.expiresAt < new Date()) return null;
    // 旋转：吊销旧 refresh，签发新对
    await this.prisma.refreshToken.update({
      where: { id: rec.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(payload.sub, payload.client as AuthClient);
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlSeconds(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!m) return 30 * 24 * 3600;
    const n = Number(m[1]);
    switch (m[2]) {
      case 's':
        return n;
      case 'm':
        return n * 60;
      case 'h':
        return n * 3600;
      case 'd':
        return n * 86400;
      default:
        return 30 * 24 * 3600;
    }
  }
}
