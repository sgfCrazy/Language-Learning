import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { DailyTaskService } from './daily-task.service';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(
    private readonly coinSvc: GamificationService,
    private readonly taskSvc: DailyTaskService,
    private readonly boardSvc: LeaderboardService,
  ) {}

  @Get('coins')
  async coins(@CurrentUser() user: { id: string }, @Query('page') page?: string) {
    const p = page ? Number(page) : 1;
    const history = await this.coinSvc.getCoinHistory(user.id, p);
    const balance = await this.coinSvc.getBalance(user.id);
    return { balance, ...history };
  }

  @Get('daily-tasks')
  async dailyTasks(@CurrentUser() user: { id: string }) {
    return { items: await this.taskSvc.getTodayTasks(user.id) };
  }

  @Post('daily-tasks/:id/claim')
  async claimTask(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.taskSvc.claimReward(user.id, id);
  }

  @Get('leaderboard')
  async leaderboard(
    @CurrentUser() user: { id: string },
    @Query('period') period?: string,
  ) {
    const p = (period === 'month' || period === 'all' ? period : 'week') as 'week' | 'month' | 'all';
    return this.boardSvc.getLeaderboard(user.id, p);
  }
}
