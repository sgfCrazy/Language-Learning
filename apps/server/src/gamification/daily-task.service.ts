import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TASK_TEMPLATES = [
  { type: 'practice_count', target: 10, reward: 20 },
  { type: 'combo_streak', target: 10, reward: 15 },
  { type: 'study_duration', target: 15, reward: 25 }, // 分钟
];

@Injectable()
export class DailyTaskService {
  constructor(private readonly prisma: PrismaService) {}

  private todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** 确保当日任务已生成，返回列表 + 实时进度 */
  async getTodayTasks(userId: string) {
    const date = this.todayStr();
    // 创建缺失的任务
    for (const tpl of TASK_TEMPLATES) {
      await this.prisma.dailyTask.upsert({
        where: { userId_date_type: { userId, date, type: tpl.type } },
        create: { userId, date, type: tpl.type, target: tpl.target, reward: tpl.reward },
        update: {},
      });
    }

    const tasks = await this.prisma.dailyTask.findMany({
      where: { userId, date },
    });

    // 计算实时进度
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');
    const records = await this.prisma.practiceRecord.findMany({
      where: { userId, createdAt: { gte: dayStart, lte: dayEnd } },
      select: { correct: true, durationMs: true, maxCombo: true },
    });

    const practiceCount = records.length;
    const maxComboToday = records.reduce((m, r) => Math.max(m, r.maxCombo), 0);
    const studyMinutes = Math.floor(records.reduce((s, r) => s + r.durationMs, 0) / 60000);

    return tasks.map((t) => {
      const progress =
        t.type === 'practice_count'
          ? practiceCount
          : t.type === 'combo_streak'
            ? maxComboToday
            : studyMinutes;
      const completed = progress >= t.target;
      // 自动标记完成（领取奖励在 gamification controller 里单独触发）
      return {
        id: t.id,
        type: t.type,
        target: t.target,
        reward: t.reward,
        completed,
        progress: Math.min(progress, t.target),
      };
    });
  }

  /** 领取任务奖励 */
  async claimReward(userId: string, taskId: string): Promise<{ reward: number; balanceAfter: number }> {
    const task = await this.prisma.dailyTask.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) throw new Error('task not found');
    if (task.claimedAt) throw new Error('already claimed');
    if (!task.completed) throw new Error('not completed');

    await this.prisma.dailyTask.update({
      where: { id: taskId },
      data: { claimedAt: new Date() },
    });

    // 发金币（直接写 CoinTransaction）
    const lastTx = await this.prisma.coinTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const balanceAfter = (lastTx?.balanceAfter ?? 0) + task.reward;
    await this.prisma.coinTransaction.create({
      data: { userId, amount: task.reward, balanceAfter, source: 'daily_task', refId: taskId },
    });
    return { reward: task.reward, balanceAfter };
  }
}
