import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';
import { AI_LLM_CLIENT } from '../src/ai/llm.client';

describe('Ai-assistant (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const fakeLlm = () => async () => `模拟解答：这个词是及物动词，后面接宾语。`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WxClient)
      .useValue({
        jscode2session: async (c: string) => ({ openid: `mock-${c}`, sessionKey: 's' }),
        getOAuthUserByCode: async () => ({ openid: 'mock-web' }),
        createQrCodeUrl: async (t: string) => `https://x/${t}`,
      })
      .overrideProvider(AI_LLM_CLIENT)
      .useValue({ chat: fakeLlm() })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const email = `ai_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'AiTester' });
    accessToken = reg.body.accessToken;
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    userId = me.body.id;
  });

  afterAll(async () => app.close());

  const askBody = {
    question: '这个词还能怎么用？',
    context: {
      text: 'The cat sleeps on the mat.',
      translation: '猫睡在垫子上。',
      tokens: [{ text: 'The', isPunctuation: false }, { text: 'sleeps', isPunctuation: false }],
    },
  };

  it('第 1/2 次提问免费并返回解答', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/ai/ask')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...askBody, question: `问题${i}` });
      expect(res.status).toBe(201);
      expect(res.body.answer).toContain('模拟解答');
      expect(res.body.mode).toBe('free');
      expect(res.body.billedCoins).toBe(0);
      expect(res.body.quota.freeUsed).toBe(i + 1);
    }
  });

  it('第 3 次起扣金币', async () => {
    // 先确保有金币可扣：提交多次答对练习（累计 > 50 金币）
    const course = await prisma.course.findFirst();
    const sentence = await prisma.sentence.findFirst({ where: { courseId: course!.id } });
    for (let i = 0; i < 2; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/progress/records')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course!.id, sentenceId: sentence!.id,
          mode: 'zh_to_en', correct: true, durationMs: 2000, attempts: 0, score: 95,
          maxCombo: 30, scoreRate: 1, clientTimestamp: Date.now() + 2 + i,
        });
    }

    const before = await request(app.getHttpServer())
      .get('/api/v1/gamification/coins')
      .set('Authorization', `Bearer ${accessToken}`);
    const beforeBalance = before.body.balance;

    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/ask')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...askBody, question: '第三次' });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe('billed');
    expect(res.body.billedCoins).toBeGreaterThan(0);
    expect(res.body.quota.balance).toBeLessThan(beforeBalance);

    // 记账：负向转账存在
    const tx = await prisma.coinTransaction.findFirst({
      where: { userId, source: 'ai_billed' },
      orderBy: { createdAt: 'desc' },
    });
    expect(tx).toBeTruthy();
    expect(tx!.amount).toBeLessThan(0);
  });

  it('余额不足时拒绝', async () => {
    // 新用户无金币：清空现存转账
    const email = `ai_2_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'Poor' });
    const token = reg.body.accessToken;

    // 用掉 2 次免费
    for (let i = 0; i < 2; i++) {
      const r = await request(app.getHttpServer())
        .post('/api/v1/ai/ask')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...askBody, question: `q${i}` });
      expect(r.status).toBe(201);
    }
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/ask')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...askBody, question: '第三问' });
    expect(res.status).toBe(403);
  });

  it('拒绝含 PII 的提问与会话上下文', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/ask')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ question: '联系 a@b.com', context: { text: 'Hi', translation: '', tokens: [] } });
    expect(res.status).toBe(400);
  });

  it('quota 端点', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/ai/quota')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.freeLimit).toBe(2);
    expect(res.body.freeUsed).toBeGreaterThanOrEqual(2);
  });
});