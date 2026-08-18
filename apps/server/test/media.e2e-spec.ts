import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Media (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

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

    const email = `media_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email, password: 'password123', displayName: 'MediaUser' });
    accessToken = reg.body.accessToken;
  });

  afterAll(async () => app.close());

  it('媒体课程返回 mediaUrl 与时间区间', async () => {
    const audioCourse = await prisma.course.findFirst({ where: { type: 'audio' } });
    const res = await request(app.getHttpServer())
      .get(`/api/v1/courses/${audioCourse!.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const first = res.body.sentences[0];
    expect(first.mediaUrl).toContain('/api/v1/media/audio/');
    expect(first.startMs).toBeGreaterThanOrEqual(0);
    expect(first.endMs).toBeGreaterThan(first.startMs);
  });

  it('生成可解析的 WAV 音频', async () => {
    const audioCourse = await prisma.course.findFirst({ where: { type: 'audio' } });
    const sentence = await prisma.sentence.findFirst({ where: { courseId: audioCourse!.id } });
    const res = await request(app.getHttpServer()).get(`/api/v1/media/audio/${sentence!.id}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/wav');
    const buf = res.body as Buffer;
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WAVE');
  });

  it('口语评测返回 0-100 分与反馈', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/media/speech-score')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sentenceText: 'How are you today?', durationMs: 1500 });
    expect(res.status).toBe(201);
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(res.body.feedback.length).toBeGreaterThan(0);
  });

  it('口语评测缺少句子时 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/media/speech-score')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ durationMs: 1000 });
    expect(res.status).toBe(400);
  });

  it('音频接口对不存在句子 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/media/audio/does-not-exist');
    expect(res.status).toBe(404);
  });
});