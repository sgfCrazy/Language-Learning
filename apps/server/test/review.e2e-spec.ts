import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Review (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `review_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Reviewer' });
    accessToken = reg.body.accessToken;

    const firstCourse = await prisma.course.findFirst();
    courseId = firstCourse!.id;
    const firstSentence = await prisma.sentence.findFirst({ where: { courseId } });
    sentenceId = firstSentence!.id;
  });

  afterAll(async () => app.close());

  it('标记生词', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/review/vocab')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ word: 'abandon' });
    expect(res.status).toBe(201);
    expect(res.body.word).toBe('abandon');
  });

  it('生词本列表', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/review/vocab')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('移入掌握', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/review/vocab')
      .set('Authorization', `Bearer ${accessToken}`);
    const id = list.body.items[0].id;
    const res = await request(app.getHttpServer())
      .post(`/api/v1/review/vocab/${id}/master`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('mastered');
  });

  it('练习答错后句子进入复习', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        courseId, sentenceId, mode: 'zh_to_en', correct: false,
        durationMs: 0, attempts: 3, score: 0,
        maxCombo: 0, scoreRate: 0, clientTimestamp: Date.now(),
      });
    expect(res.status).toBe(201);

    const today = await request(app.getHttpServer())
      .get('/api/v1/review/today')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(today.status).toBe(200);
    expect(today.body.sentences.length).toBeGreaterThanOrEqual(1);
  });

  it('练习答对后句子复习间隔延长', async () => {
    // 先答错一次（上面已做），再答对
    const res = await request(app.getHttpServer())
      .post('/api/v1/progress/records')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        courseId, sentenceId, mode: 'zh_to_en', correct: true,
        durationMs: 2000, attempts: 0, score: 90,
        maxCombo: 5, scoreRate: 0.9, clientTimestamp: Date.now() + 1,
      });
    expect(res.status).toBe(201);

    // 检查复习状态：答对后 dueAt 应在未来
    const vocab = await prisma.userVocab.findUnique({
      where: { userId_word: { userId: (await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`)).body.id, word: `sentence:${sentenceId}` } },
    });
    expect(vocab).toBeTruthy();
    expect(vocab!.reps).toBeGreaterThanOrEqual(1);
    expect(vocab!.dueAt.getTime()).toBeGreaterThan(Date.now());
  });
});
