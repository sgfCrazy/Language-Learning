import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 积分榜：按 CoinTransaction.amount 之和排序。
   * period: 'week' | 'month' | 'all'
   */
  async getLeaderboard(userId: string, period: 'week' | 'month' | 'all' = 'week', limit = 50) {
    const now = new Date();
    let since: Date;
    if (period === 'week') {
      since = new Date(now.getTime() - 7 * 86400 * 1000);
    } else if (period === 'month') {
      since = new Date(now.getTime() - 30 * 86400 * 1000);
    } else {
      since = new Date(0);
    }

    // 聚合每用户在 period 内的金币总和
    const rows = await this.prisma.coinTransaction.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    if (rows.length === 0) {
      return { items: [], myRank: -1, myScore: 0, period };
    }

    const userIds = rows.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items = rows.map((r, i) => {
      const u = userMap.get(r.userId);
      return {
        rank: i + 1,
        userId: r.userId,
        displayName: u?.displayName ?? '未知用户',
        avatarUrl: u?.avatarUrl ?? null,
        score: r._sum.amount ?? 0,
      };
    });

    // 找自己的排名
    let myRank = -1;
    let myScore = 0;
    const myEntry = items.find((it) => it.userId === userId);
    if (myEntry) {
      myRank = myEntry.rank;
      myScore = myEntry.score;
    } else {
      // 不在 top N，单独查
      const myAgg = await this.prisma.coinTransaction.aggregate({
        where: { userId, createdAt: { gte: since } },
        _sum: { amount: true },
      });
      myScore = myAgg._sum.amount ?? 0;
      if (myScore > 0) {
        // 计算排名：比我分高的人数 + 1
        const higherCount = await this.prisma.coinTransaction.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: since } },
          _sum: { amount: true },
          having: { amount: { _sum: { gt: myScore } } },
        });
        myRank = higherCount.length + 1;
      }
    }

    return { items, myRank, myScore, period };
  }
}
