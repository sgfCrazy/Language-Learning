import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { updateReviewState, isMastered, isDue, INITIAL_REVIEW, type ReviewState } from '@app/shared';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  // === 生词本 ===

  async addVocab(userId: string, word: string) {
    return this.prisma.userVocab.upsert({
      where: { userId_word: { userId, word } },
      create: { userId, word, status: 'unknown', ...INITIAL_REVIEW_STATE() },
      update: {}, // 已存在则不动
    });
  }

  async listVocab(userId: string, status?: string) {
    const where: { userId: string; status?: string } = { userId };
    if (status) where.status = status;
    return this.prisma.userVocab.findMany({ where, orderBy: { dueAt: 'asc' } });
  }

  async removeVocab(userId: string, vocabId: string) {
    const v = await this.prisma.userVocab.findUnique({ where: { id: vocabId } });
    if (!v || v.userId !== userId) throw new NotFoundException('vocab not found');
    await this.prisma.userVocab.delete({ where: { id: vocabId } });
    return { status: 'ok' };
  }

  async markMastered(userId: string, vocabId: string) {
    const v = await this.prisma.userVocab.findUnique({ where: { id: vocabId } });
    if (!v || v.userId !== userId) throw new NotFoundException('vocab not found');
    return this.prisma.userVocab.update({
      where: { id: vocabId },
      data: { status: 'mastered' },
    });
  }

  async unmarkMastered(userId: string, vocabId: string) {
    const v = await this.prisma.userVocab.findUnique({ where: { id: vocabId } });
    if (!v || v.userId !== userId) throw new NotFoundException('vocab not found');
    return this.prisma.userVocab.update({
      where: { id: vocabId },
      data: { status: 'learning' },
    });
  }

  // === 每日复习推荐 ===

  async getTodayReview(userId: string) {
    const now = new Date();
    // 1. 到期的生词
    const dueVocab = await this.prisma.userVocab.findMany({
      where: { userId, status: { not: 'mastered' }, dueAt: { lte: now } },
      orderBy: { dueAt: 'asc' },
    });

    // 2. 答错的句子（最近 7 天内 correct=false，且未在同一日内答对过）
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400 * 1000);
    const wrongRecords = await this.prisma.practiceRecord.findMany({
      where: { userId, correct: false, createdAt: { gte: sevenDaysAgo } },
      include: { sentence: { select: { id: true, text: true, translation: true, courseId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 去重：同一句子只取最近一次
    const seen = new Set<string>();
    const dueSentences = wrongRecords
      .filter((r) => {
        if (seen.has(r.sentenceId)) return false;
        seen.add(r.sentenceId);
        return true;
      })
      .map((r) => ({
        sentenceId: r.sentenceId,
        courseId: r.sentence.courseId,
        text: r.sentence.text,
        translation: r.sentence.translation,
      }));

    return {
      vocab: dueVocab.map((v) => ({ id: v.id, word: v.word, status: v.status, dueAt: v.dueAt.toISOString() })),
      sentences: dueSentences,
    };
  }

  // === 答题后更新复习调度 ===

  async onPracticeAnswered(userId: string, sentenceId: string, correct: boolean) {
    // 句子级复习：用 UserVocab 表存句子级复习状态（word 字段存 sentenceId）
    const existing = await this.prisma.userVocab.findUnique({
      where: { userId_word: { userId, word: `sentence:${sentenceId}` } },
    });

    const prevState: ReviewState = existing
      ? { interval: existing.interval, ease: existing.ease, reps: existing.reps, dueAt: existing.dueAt.getTime() }
      : INITIAL_REVIEW;

    const newState = updateReviewState(prevState, correct);
    const mastered = isMastered(newState);

    await this.prisma.userVocab.upsert({
      where: { userId_word: { userId, word: `sentence:${sentenceId}` } },
      create: {
        userId,
        word: `sentence:${sentenceId}`,
        status: mastered ? 'mastered' : 'learning',
        interval: newState.interval,
        ease: newState.ease,
        reps: newState.reps,
        dueAt: new Date(newState.dueAt),
      },
      update: {
        status: mastered ? 'mastered' : 'learning',
        interval: newState.interval,
        ease: newState.ease,
        reps: newState.reps,
        dueAt: new Date(newState.dueAt),
      },
    });
  }
}

function INITIAL_REVIEW_STATE() {
  const r = INITIAL_REVIEW;
  return { interval: r.interval, ease: r.ease, reps: r.reps, dueAt: new Date(r.dueAt) };
}
