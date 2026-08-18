import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rating, rateByScoreRate } from '@app/shared';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 练习结算：发放金币。公式: base + comboBonus + ratingBonus
   * - base: 答对 5，答错 1
   * - comboBonus: maxCombo >= 20 → +20; >= 10 → +10; >= 5 → +5
   * - ratingBonus: SSS → +30; SS → +20; S → +10; A → +5
   */
  async rewardPractice(args: {
    userId: string;
    recordId: string;
    correct: boolean;
    maxCombo: number;
    scoreRate: number;
  }): Promise<{ coinsEarned: number; balanceAfter: number; rating: Rating }> {
    const { userId, recordId, correct, maxCombo, scoreRate } = args;
    const base = correct ? 5 : 1;
    const comboBonus = maxCombo >= 20 ? 20 : maxCombo >= 10 ? 10 : maxCombo >= 5 ? 5 : 0;
    const rating = rateByScoreRate(scoreRate);
    const ratingBonus =
      rating === Rating.SSS ? 30 : rating === Rating.SS ? 20 : rating === Rating.S ? 10 : rating === Rating.A ? 5 : 0;
    const coinsEarned = base + comboBonus + ratingBonus;

    const balanceAfter = await this.addCoins(userId, coinsEarned, 'practice', recordId);
    return { coinsEarned, balanceAfter, rating };
  }

  /** 给用户加金币（原子操作），返回新余额 */
  async addCoins(userId: string, amount: number, source: string, refId?: string): Promise<number> {
    const lastTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const balanceAfter = (lastTx?.balanceAfter ?? 0) + amount;
    await this.prisma.coinTransaction.create({
      data: { userId, amount, balanceAfter, source, refId: refId ?? null },
    });
    return balanceAfter;
  }

  /** 扣除用户金币（原子操作），返回新余额。余额不足抛错 */
  async spendCoins(userId: string, amount: number, source: string, refId?: string): Promise<number> {
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error(`INSUFFICIENT_COINS: need ${amount}, has ${balance}`);
    }
    return this.addCoins(userId, -amount, source, refId);
  }

  async getCoinHistory(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.coinTransaction.count({ where: { userId } }),
    ]);
    return {
      items: items.map((t) => ({
        id: t.id,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        source: t.source,
        refId: t.refId,
        createdAt: t.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getBalance(userId: string): Promise<number> {
    const lastTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return lastTx?.balanceAfter ?? 0;
  }
}
