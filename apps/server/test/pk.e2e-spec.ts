import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WxClient } from '../src/auth/wx.client';
import { PkService } from '../src/pk/pk.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Pk-battles (e2e)', () => {
  let app: INestApplication;
  let pk: PkService;
  let prisma: PrismaService;
  let userA: string;
  let userB: string;
  let coursePackId: string;

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
    pk = app.get(PkService);
    prisma = app.get(PrismaService);

    const suffix = Date.now();
    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email: `pk_a_${suffix}@example.com`, password: 'password123', displayName: 'PKerA' });
    userA = regA.body.accessToken;
    const meA = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${userA}`);
    const userIdA = meA.body.id;

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register/email')
      .send({ email: `pk_b_${suffix}@example.com`, password: 'password123', displayName: 'PKerB' });
    userB = regB.body.accessToken;
    const meB = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${userB}`);
    const userIdB = meB.body.id;

    void userIdA;
    void userIdB;
    const packs = await request(app.getHttpServer()).get('/api/v1/course-packs');
    coursePackId = packs.body.items[0].id;
  });

  afterAll(async () => app.close());

  it('创建公开房间进入大厅', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pk/rooms')
      .set('Authorization', `Bearer ${userA}`)
      .send({ mode: 'public', coursePackId, questionCount: 3 });
    expect(res.status).toBe(201);
    expect(res.body.mode).toBe('public');
    expect(res.body.status).toBe('waiting');
    expect(res.body.players).toHaveLength(1);

    const list = await request(app.getHttpServer()).get('/api/v1/pk/rooms').set('Authorization', `Bearer ${userA}`);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('创建私密房间生成房间号，可用房间号加入', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pk/rooms')
      .set('Authorization', `Bearer ${userA}`)
      .send({ mode: 'private', coursePackId, questionCount: 2 });
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^\d{6}$/);

    const join = await request(app.getHttpServer())
      .post(`/api/v1/pk/rooms/code/${res.body.code}/join`)
      .set('Authorization', `Bearer ${userB}`);
    expect(join.status).toBe(201);
    expect(join.body.status).toBe('ready');
    expect(join.body.players).toHaveLength(2);
  });

  it('随机匹配两人配对成功', async () => {
    const r1 = await request(app.getHttpServer()).post('/api/v1/pk/match').set('Authorization', `Bearer ${userA}`);
    const r2 = await request(app.getHttpServer()).post('/api/v1/pk/match').set('Authorization', `Bearer ${userB}`);
    expect(r1.body.queued === false || r2.body.queued === false).toBe(true);
    const room = r1.body.queued === false ? r1.body.room : r2.body.room;
    expect(room).toBeTruthy();
    expect(room.status).toBe('ready');
    expect(room.players).toHaveLength(2);
  });

  it('匹配取消', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/pk/match')
      .set('Authorization', `Bearer ${userA}`);
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(true);
  });

  it('对战后计入积分榜', async () => {
    // 建私密房
    const room = await request(app.getHttpServer())
      .post('/api/v1/pk/rooms')
      .set('Authorization', `Bearer ${userA}`)
      .send({ mode: 'private', coursePackId, questionCount: 2 });
    const roomId = room.body.roomId;
    const code = room.body.code;

    await request(app.getHttpServer())
      .post(`/api/v1/pk/rooms/code/${code}/join`)
      .set('Authorization', `Bearer ${userB}`);

    // 直接驱动服务端对局（网关事件在此按序模拟）
    const [pA, pB] = (await pk.getRoom(roomId)).players;
    await pk.startGame(roomId);
    // 每题：A 先正确，B 后正确
    for (let i = 0; i < 2; i++) {
      await pk.answer(pA.userId, roomId, i, true);
      await pk.answer(pB.userId, roomId, i, true);
      await pk.nextQuestion(roomId);
    }
    const result = await pk.resultFor(roomId, pA.userId);
    expect(result.myScore).toBeGreaterThan(result.opponentScore);
    expect(result.pointsDelta).toBe(20);

    // 战绩已入库
    const match = await prisma.pkMatch.findUnique({ where: { roomId } });
    expect(match).toBeTruthy();
    expect(match!.winnerId).toBe(pA.userId);

    // 积分榜出现
    const lb = await request(app.getHttpServer())
      .get('/api/v1/pk/leaderboard')
      .set('Authorization', `Bearer ${userA}`);
    expect(lb.body.items.length).toBeGreaterThanOrEqual(1);
  });
});