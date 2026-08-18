import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PkRoomStore, PkRoom } from './pk-room.store';
import {
  PK_DEFAULT_QUESTION_COUNT,
  PK_DEFAULT_TIME_LIMIT_MS,
  PkPlayer,
  PkQuestion,
  PkResult,
  pickPkQuestions,
  pkPointsDelta,
  scorePkAnswer,
} from '@app/shared';

export interface PkUserInfo {
  id: string;
  displayName: string;
}

@Injectable()
export class PkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: PkRoomStore,
  ) {}

  private async playerOf(u: PkUserInfo): Promise<PkPlayer> {
    return { userId: u.id, displayName: u.displayName, score: 0, correctCount: 0, connected: true };
  }

  /** 从 DB 取用户展示信息 */
  async userInfo(userId: string): Promise<PkUserInfo> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    return { id: user.id, displayName: user.displayName };
  }

  /** 抽题：优先用户已加入的课程包，否则首个公开课程包 */
  private async loadQuestions(userId: string, coursePackId?: string, count = PK_DEFAULT_QUESTION_COUNT): Promise<PkQuestion[]> {
    let packId = coursePackId;
    if (!packId) {
      const membership = await this.prisma.userCoursePack.findFirst({
        where: { userId },
        include: { coursePack: { include: { courses: { include: { sentences: true } } } } },
      });
      packId = membership?.coursePackId ?? (await this.prisma.coursePack.findFirst())?.id;
    }
    if (!packId) throw new NotFoundException('没有可用的题目课程包');
    const sentences = await this.prisma.sentence.findMany({
      where: { course: { coursePackId: packId } },
      orderBy: { order: 'asc' },
    });
    const picked = pickPkQuestions(sentences, count);
    return picked.map((s, i) => ({
      questionIndex: i,
      translation: s.translation,
      tokens: (JSON.parse(s.tokens) as { id: string; text: string; isPunctuation?: boolean }[])
        .filter((t) => !t.isPunctuation)
        .map((t) => ({ id: t.id, text: t.text })),
      timeLimitMs: PK_DEFAULT_TIME_LIMIT_MS,
    }));
  }

  async createRoom(user: PkUserInfo, opts: { mode: 'public' | 'private'; coursePackId?: string; questionCount?: number }) {
    const count = Math.min(10, Math.max(2, opts.questionCount ?? PK_DEFAULT_QUESTION_COUNT));
    const questions = await this.loadQuestions(user.id, opts.coursePackId, count);
    const creator = await this.playerOf(user);
    const room = this.store.createRoom({
      mode: opts.mode,
      coursePackId: opts.coursePackId,
      questionCount: count,
      timeLimitMs: PK_DEFAULT_TIME_LIMIT_MS,
      questions,
      creator,
    });
    return this.store.snapshot(room);
  }

  listRooms() {
    return this.store.listPublic();
  }

  async joinRoom(user: PkUserInfo, roomId: string) {
    const player = await this.playerOf(user);
    const room = this.store.join(roomId, player);
    return this.store.snapshot(room);
  }

  async joinByCode(user: PkUserInfo, code: string) {
    const room = this.store.findByCode(code);
    if (!room) throw new NotFoundException('房间不存在或已满');
    return this.joinRoom(user, room.roomId);
  }

  getRoom(roomId: string) {
    const room = this.store.get(roomId);
    if (!room) throw new NotFoundException('房间不存在');
    return this.store.snapshot(room);
  }

  /** 发起匹配：有对手则建房返回，否则入队 */
  async startMatch(user: PkUserInfo) {
    this.store.dequeue(user.id);
    const ticket = { ticketId: `mt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, userId: user.id, createdAt: Date.now() };
    this.store.enqueue(ticket);
    const pair = this.store.pair();
    if (!pair) return { queued: true, ticketId: ticket.ticketId };
    const [a, b] = pair;
    const [qa, qb] = await Promise.all([this.loadQuestions(a.userId), this.loadQuestions(b.userId)]);
    const questions = qa.length >= qb.length ? qa : qb;
    const users = await this.prisma.user.findMany({ where: { id: { in: [a.userId, b.userId] } } });
    const nameOf = (id: string) => users.find((u) => u.id === id)?.displayName ?? id;
    const ra = await this.playerOf({ id: a.userId, displayName: nameOf(a.userId) });
    const rb = await this.playerOf({ id: b.userId, displayName: nameOf(b.userId) });
    const room = this.store.createRoom({
      mode: 'public',
      questionCount: questions.length,
      timeLimitMs: PK_DEFAULT_TIME_LIMIT_MS,
      questions,
      creator: ra,
    });
    this.store.join(room.roomId, rb);
    return { queued: false, room: this.store.snapshot(room) };
  }

  cancelMatch(user: PkUserInfo) {
    this.store.dequeue(user.id);
    return { cancelled: true };
  }

  async answer(userId: string, roomId: string, questionIndex: number, correct: boolean) {
    const room = this.store.get(roomId);
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status !== 'playing' || questionIndex !== room.questionIndex) {
      throw new BadRequestException('题目已过期');
    }
    const order = room.answerOrders++;
    const points = correct ? scorePkAnswer(order) : 0;
    room.scores[userId] = (room.scores[userId] ?? 0) + points;
    if (correct) room.correctCounts[userId] = (room.correctCounts[userId] ?? 0) + 1;
    return { points, score: room.scores[userId] };
  }

  async nextQuestion(roomId: string): Promise<PkQuestion | null> {
    const room = this.store.get(roomId);
    if (!room) throw new NotFoundException('房间不存在');
    room.questionIndex += 1;
    room.answerOrders = 0;
    if (room.questionIndex >= room.questions.length) {
      room.status = 'finished';
      await this.finish(room);
      return null;
    }
    return room.questions[room.questionIndex]!;
  }

  async startGame(roomId: string) {
    const room = this.store.get(roomId);
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status !== 'ready' || room.players.length < 2) throw new BadRequestException('需两人就绪');
    room.status = 'playing';
    return room.questions[0]!;
  }

  private async finish(room: PkRoom) {
    const [a, b] = room.players;
    if (!a || !b) throw new BadRequestException('房间玩家不足');
    const scoreA = room.scores[a.userId] ?? 0;
    const scoreB = room.scores[b.userId] ?? 0;
    const correctA = room.correctCounts[a.userId] ?? 0;
    const correctB = room.correctCounts[b.userId] ?? 0;
    const winnerId = scoreA === scoreB ? null : scoreA > scoreB ? a.userId : b.userId;
    room.winnerId = winnerId;

    const match = await this.prisma.pkMatch.create({
      data: {
        roomId: room.roomId,
        playerAId: a.userId,
        playerBId: b.userId,
        scoreA,
        scoreB,
        correctA,
        correctB,
        winnerId,
        coursePackId: room.coursePackId ?? null,
        questionCount: room.questionCount,
      },
    });

    const deltaA = pkPointsDelta(winnerId === a.userId, winnerId === null);
    const deltaB = pkPointsDelta(winnerId === b.userId, winnerId === null);
    return {
      matchId: match.id,
      winnerId,
      players: [
        { userId: a.userId, score: scoreA, correct: correctA, pointsDelta: deltaA },
        { userId: b.userId, score: scoreB, correct: correctB, pointsDelta: deltaB },
      ],
    };
  }

  /** 用户视角结果 */
  async resultFor(roomId: string, userId: string): Promise<PkResult> {
    const room = this.store.get(roomId);
    if (!room) throw new NotFoundException('房间不存在');
    const [a, b] = room.players;
    if (!a || !b) throw new BadRequestException('房间玩家不足');
    const me = a.userId === userId ? a : b;
    const opp = a.userId === userId ? b : a;
    const delta = pkPointsDelta(room.winnerId === me.userId, room.winnerId === null);
    return {
      roomId,
      winnerId: room.winnerId,
      myScore: room.scores[me.userId] ?? 0,
      opponentScore: room.scores[opp.userId] ?? 0,
      myCorrect: room.correctCounts[me.userId] ?? 0,
      opponentCorrect: room.correctCounts[opp.userId] ?? 0,
      pointsDelta: delta,
    };
  }

  async leaderboard() {
    const matches = await this.prisma.pkMatch.findMany();
    const agg = new Map<string, { wins: number; losses: number; draws: number; total: number }>();
    for (const m of matches) {
      for (const pid of [m.playerAId, m.playerBId]) {
        const e = agg.get(pid) ?? { wins: 0, losses: 0, draws: 0, total: 0 };
        if (m.winnerId === null) e.draws += 1;
        else if (m.winnerId === pid) e.wins += 1;
        else e.losses += 1;
        e.total += pkPointsDelta(m.winnerId === pid, m.winnerId === null);
        agg.set(pid, e);
      }
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...agg.keys()] } },
    });
    const nameOf = (id: string) => users.find((u) => u.id === id)?.displayName ?? id;
    const items = [...agg.entries()]
      .map(([userId, s]) => ({
        userId,
        displayName: nameOf(userId),
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        score: s.total,
      }))
      .sort((x, y) => y.score - x.score)
      .slice(0, 50);
    return { items };
  }
}