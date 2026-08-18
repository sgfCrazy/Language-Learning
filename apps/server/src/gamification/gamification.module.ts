import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { DailyTaskService } from './daily-task.service';
import { LeaderboardService } from './leaderboard.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GamificationController],
  providers: [GamificationService, DailyTaskService, LeaderboardService],
  exports: [GamificationService],
})
export class GamificationModule {}
