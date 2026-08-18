import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Progress (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let courseId: string;
  let sentenceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WxClient)
      .useValue({
        jscode2session: async (c: string) => ({ openid: `mock-${c}`, sessionKey: 's' }),
        getOAuthUserByCode: async () => ({ openid: 'mock-web' }),
        createQrCodeUrl: async (t: string) => `https://x/${t}`,
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `progress_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Tester' });
    accessToken = reg.body.accessToken;
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    userId = me.body.id;

    const firstCourse = await prisma.course.findFirst();
    courseId = firstCourse!.id;
    const firstSentence = await prisma.sentence.findFirst({ where: { courseId } });
    sentenceId = firstSentence!.id;
  });

  afterAll(async () => app.close());

  it('写入练习记录', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        courseId, sentenceId, mode: 'zh_to_en', correct: true,
        durationMs: 3200, attempts: 0, score: 90, clientTimestamp: Date.now(),
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it('重复上报相同 clientTimestamp 不产生重复', async () => {
    const ts = Date.now();
    const r1 = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseId, sentenceId, mode: 'zh_to_en', correct: true, durationMs: 1000, attempts: 0, score: 80, clientTimestamp: ts });
    const r2 = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ courseId, sentenceId, mode: 'zh_to_en', correct: true, durationMs: 1000, attempts: 0, score: 80, clientTimestamp: ts });
    expect(r1.body.id).toBe(r2.body.id);
    const count = await prisma.practiceRecord.count({ where: { userId, sentenceId, clientTimestamp: ts } });
    expect(count).toBe(1);
  });

  it('growth 返回聚合与连续打卡', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/progress/growth')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalQuestions).toBeGreaterThanOrEqual(1);
    expect(res.body.currentStreak).toBeGreaterThanOrEqual(1);
  });

  it('heatmap 返回当日数据', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/progress/heatmap')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('courseDetail 返回每题明细', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/progress/courses/${courseId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const found = res.body.items.find((i: { sentenceId: string }) => i.sentenceId === sentenceId);
    expect(found.lastPracticedAt).not.toBe(null);
  });
});
