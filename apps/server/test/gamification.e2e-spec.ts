import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Gamification (e2e)', () => {
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

    const email = `gamify_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Player1' });
    accessToken = reg.body.accessToken;
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    userId = me.body.id;

    const firstCourse = await prisma.course.findFirst();
    courseId = firstCourse!.id;
    const firstSentence = await prisma.sentence.findFirst({ where: { courseId } });
    sentenceId = firstSentence!.id;
  });

  afterAll(async () => app.close());

  it('练习结算返回金币与评级', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        courseId, sentenceId, mode: 'zh_to_en', correct: true,
        durationMs: 2000, attempts: 0, score: 95,
        maxCombo: 15, scoreRate: 0.95, clientTimestamp: Date.now(),
      });
    expect(res.status).toBe(201);
    expect(res.body.coinsEarned).toBeGreaterThan(0);
    expect(res.body.rating).toBe('SSS');
    expect(res.body.balanceAfter).toBeGreaterThan(0);
  });

  it('金币历史可查', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/gamification/coins')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBeGreaterThan(0);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('每日任务列表返回 3 个任务', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/gamification/daily-tasks')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(3);
    // 已练习 1 题，practice_count 进度应 >= 1
    const pc = res.body.items.find((t: { type: string }) => t.type === 'practice_count');
    expect(pc.progress).toBeGreaterThanOrEqual(1);
  });

  it('排行榜返回且包含自己', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/gamification/leaderboard?period=week')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.myScore).toBeGreaterThan(0);
  });
});
