import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { WxClient } from './wx.client';
import {
  EmailLoginDto,
  EmailRegisterDto,
  RefreshDto,
  WxMiniappLoginDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthClient } from '@app/shared';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly wx: WxClient,
  ) {}

  @Post('register/email')
  @HttpCode(201)
  async registerEmail(@Body() dto: EmailRegisterDto) {
    const tokens = await this.auth.registerByEmail(dto.email, dto.password, dto.displayName);
    return tokens;
  }

  @Post('login/email')
  @HttpCode(200)
  async loginEmail(@Body() dto: EmailLoginDto) {
    const res = await this.auth.loginByEmail(dto.email, dto.password);
    if (!res) {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    return res.tokens;
  }

  @Post('wx/miniapp')
  @HttpCode(200)
  async wxMiniapp(@Body() dto: WxMiniappLoginDto) {
    const session = await this.wx.jscode2session(dto.code);
    const user = await this.auth.findOrCreateByWx({
      provider: 'wx-miniapp',
      openid: session.openid,
      unionid: session.unionid,
    });
    return this.auth.issueTokens(user.id, AuthClient.MiniApp);
  }

  // Web 扫码登录：生成 ticket -> 客户端轮询
  @Post('wx/qrcode')
  @HttpCode(200)
  async wxQrCode() {
    const ticket = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const qrUrl = await this.wx.createQrCodeUrl(ticket);
    // 本期 ticket 暂存内存（多实例部署应放 Redis）；回调时凭 ticket 找到 code。
    pendingTickets.set(ticket, { code: null, status: 'pending' });
    return { ticket, qrUrl };
  }

  @Get('wx/poll')
  async wxPoll(@Query('ticket') ticket: string) {
    const entry = pendingTickets.get(ticket);
    if (!entry) throw new BadRequestException('invalid ticket');
    if (entry.status === 'pending' || !entry.code) {
      return { status: 'pending' as const };
    }
    const oauth = await this.wx.getOAuthUserByCode(entry.code);
    const user = await this.auth.findOrCreateByWx({
      provider: 'wx-web',
      openid: oauth.openid,
      unionid: oauth.unionid,
      nickname: oauth.nickname,
      avatarUrl: oauth.headImgUrl,
    });
    const tokens = await this.auth.issueTokens(user.id, AuthClient.Web);
    pendingTickets.delete(ticket);
    return { status: 'ok' as const, ...tokens };
  }

  @Get('wx/callback')
  async wxCallback(@Query('code') code: string, @Query('state') state: string) {
    // state 作为 ticket
    const ticket = state;
    const entry = pendingTickets.get(ticket);
    if (!entry) throw new BadRequestException('invalid state ticket');
    entry.code = code;
    entry.status = 'ok';
    return { status: 'ok' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.auth.refresh(dto.refreshToken);
    if (!tokens) throw new UnauthorizedException('invalid refresh token');
    return tokens;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: { id: string }) {
    await this.auth.revokeAll(user.id);
    return { status: 'ok' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { id: string }, @Req() req: Request) {
    void req;
    return { id: user.id };
  }
}

// 内存暂存扫码 ticket -> code（单实例开发用；多实例用 Redis）。
interface PendingEntry {
  code: string | null;
  status: 'pending' | 'ok';
}
const pendingTickets = new Map<string, PendingEntry>();
