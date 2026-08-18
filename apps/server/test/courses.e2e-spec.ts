import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Courses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let packId: string;
  let courseId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WxClient)
      .useValue({
        jscode2session: async (code: string) => ({ openid: `mock-${code}`, sessionKey: 's' }),
        getOAuthUserByCode: async () => ({ openid: 'mock-web' }),
        createQrCodeUrl: async (t: string) => `https://x/${t}`,
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // 注册一个邮箱用户
    const email = `courses_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Tester' });
    accessToken = reg.body.accessToken;
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    userId = me.body.id;
  });

  afterAll(async () => app.close());

  it('商城列表返回种子课程包', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/course-packs');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    packId = res.body.items[0].id;
  });

  it('按难度筛选', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/course-packs?level=beginner');
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: { level: string }) => i.level === 'beginner')).toBe(true);
  });

  it('关键词搜索', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/course-packs?q=PTE');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].title).toContain('PTE');
  });

  it('详情返回课程列表', async () => {
    const res = await request(app.getHttpServer()).get(`/api/v1/course-packs/${packId}`);
    expect(res.status).toBe(200);
    expect(res.body.courses.length).toBeGreaterThanOrEqual(1);
    courseId = res.body.courses[0].id;
  });

  it('加入学习需登录', async () => {
    const noAuth = await request(app.getHttpServer()).post(`/api/v1/course-packs/${packId}/join`);
    expect(noAuth.status).toBe(401);
  });

  it('加入学习后已加入且初始化进度', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/course-packs/${packId}/join`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(201);

    const det = await request(app.getHttpServer())
      .get(`/api/v1/course-packs/${packId}/detail`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(det.body.joined).toBe(true);
  });

  it('句子懒加载含词块', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.sentences.length).toBeGreaterThanOrEqual(1);
    const first = res.body.sentences[0];
    expect(Array.isArray(first.tokens)).toBe(true);
    expect(first.tokens.length).toBeGreaterThanOrEqual(1);
  });

  it('保存与读取进度', async () => {
    const save = await request(app.getHttpServer())
      .post(`/api/v1/courses/${courseId}/progress`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ mode: 'zh_to_en', sentenceOrder: 3, completed: false });
    expect(save.status).toBe(201);

    const data = await request(app.getHttpServer())
      .get(`/api/v1/courses/${courseId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(data.body.progress.sentenceOrder).toBe(3);
  });
});
