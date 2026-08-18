import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let emailCounter = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WxClient)
      .useValue({
        jscode2session: async (code: string) => ({
          openid: `mock-openid-${code}`,
          unionid: undefined,
          sessionKey: 'mock-sk',
        }),
        getOAuthUserByCode: async (code: string) => ({
          openid: `mock-web-${code}`,
          unionid: undefined,
          nickname: 'MockUser',
          headImgUrl: undefined,
        }),
        createQrCodeUrl: async (ticket: string) => `https://example.com/qr/${ticket}`,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  function uniqueEmail(): string {
    emailCounter += 1;
    return `user${Date.now()}_${emailCounter}@example.com`;
  }

  it('邮箱注册 -> 拿到 token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email: uniqueEmail(), password: 'password123', displayName: 'Tester' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it('邮箱登录失败返回统一错误', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login/email')
      .send({ email: 'nonexistent@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('邮箱或密码错误');
  });

  it('邮箱登录成功 + refresh 旋转 + me', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Tester' });

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login/email')
      .send({ email, password: 'password123' });
    expect(login.status).toBe(200);
    const access = login.body.accessToken as string;
    const refresh = login.body.refreshToken as string;

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${access}`);
    expect(me.status).toBe(200);

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    // 旧 refresh 已被吊销
    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh });
    expect(reused.status).toBe(401);
  });

  it('微信小程序登录（mock）创建用户并签发 token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/wx/miniapp')
      .send({ code: 'mock-code-1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('任意格式账号密码均可注册（无格式校验）', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email: `user+${Date.now()} abc@x`, password: '123', displayName: 'X' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('重复注册返回 409 友好提示而非 500', async () => {
    const email = `dup-${Date.now()}@x`;
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: '1', displayName: 'D' });
    expect(first.status).toBe(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: '1', displayName: 'D' });
    expect(second.status).toBe(409);
    expect(second.body.message).toContain('该账号已注册');
  });
});
