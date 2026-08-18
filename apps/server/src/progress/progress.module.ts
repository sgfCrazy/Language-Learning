import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [PrismaModule, GamificationModule, ReviewModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
