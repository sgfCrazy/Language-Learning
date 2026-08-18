import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GrowthRow {
  date: string;
  durationMs: number;
  count: number;
  correct: number;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async submitRecord(
    userId: string,
    input: {
      courseId: string;
      sentenceId: string;
      mode: string;
      correct: boolean;
      durationMs: number;
      attempts: number;
      score: number;
      clientTimestamp: number;
    },
  ) {
    // 去重：userId+sentenceId+clientTimestamp 唯一约束
    const rec = await this.prisma.practiceRecord.upsert({
      where: {
        userId_sentenceId_clientTimestamp: {
          userId,
          sentenceId: input.sentenceId,
          clientTimestamp: input.clientTimestamp,
        },
      },
      create: {
        userId,
        courseId: input.courseId,
        sentenceId: input.sentenceId,
        mode: input.mode,
        correct: input.correct,
        durationMs: input.durationMs,
        attempts: input.attempts,
        score: input.score,
        clientTimestamp: input.clientTimestamp,
      },
      update: {}, // 已存在则不动
    });
    return { id: rec.id };
  }

  async heatmap(userId: string, rangeDays = 90): Promise<{ items: GrowthRow[] }> {
    const since = new Date(Date.now() - rangeDays * 86400 * 1000);
    const records = await this.prisma.practiceRecord.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, durationMs: true, correct: true },
    });
    const map = new Map<string, GrowthRow>();
    for (const r of records) {
      const date = r.createdAt.toISOString().slice(0, 10);
      const row = map.get(date) ?? { date, durationMs: 0, count: 0, correct: 0 };
      row.durationMs += r.durationMs;
      row.count += 1;
      if (r.correct) row.correct += 1;
      map.set(date, row);
    }
    return { items: Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1)) };
  }

  async growth(userId: string) {
    const records = await this.prisma.practiceRecord.findMany({
      where: { userId },
      select: { createdAt: true, durationMs: true, correct: true },
    });
    const totalDurationMs = records.reduce((s, r) => s + r.durationMs, 0);
    const totalQuestions = records.length;
    const correct = records.filter((r) => r.correct).length;
    const accuracy = totalQuestions ? correct / totalQuestions : 0;

    // 连续打卡：从今天往前数有练习记录的连续天数
    const days = new Set(records.map((r) => r.createdAt.toISOString().slice(0, 10)));
    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
      if (days.has(d)) {
        currentStreak += 1;
      } else if (i === 0) {
        // 今天还没练，不算断，继续看昨天
        continue;
      } else {
        break;
      }
    }
    const totalDays = days.size;

    // 按日聚合时间序列
    const map = new Map<string, GrowthRow>();
    for (const r of records) {
      const date = r.createdAt.toISOString().slice(0, 10);
      const row = map.get(date) ?? { date, durationMs: 0, count: 0, correct: 0 };
      row.durationMs += r.durationMs;
      row.count += 1;
      if (r.correct) row.correct += 1;
      map.set(date, row);
    }

    return {
      totalDays,
      totalDurationMs,
      currentStreak,
      totalQuestions,
      accuracy,
      items: Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1)),
    };
  }

  async courseDetail(userId: string, courseId: string) {
    const sentences = await this.prisma.sentence.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
    // 每句最近一次练习
    const recent = await this.prisma.practiceRecord.findMany({
      where: { userId, courseId },
      orderBy: { createdAt: 'desc' },
      select: { sentenceId: true, correct: true, durationMs: true, attempts: true, score: true, createdAt: true },
    });
    const latest = new Map<string, (typeof recent)[number]>();
    for (const r of recent) {
      if (!latest.has(r.sentenceId)) latest.set(r.sentenceId, r);
    }
    return {
      items: sentences.map((s) => {
        const r = latest.get(s.id);
        return {
          sentenceId: s.id,
          order: s.order,
          correct: r?.correct ?? false,
          durationMs: r?.durationMs ?? 0,
          attempts: r?.attempts ?? 0,
          score: r?.score ?? 0,
          lastPracticedAt: r?.createdAt.toISOString() ?? null,
        };
      }),
    };
  }
}
