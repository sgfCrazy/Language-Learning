import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CoursesModule } from './courses/courses.module';
import { ProgressModule } from './progress/progress.module';
import { GamificationModule } from './gamification/gamification.module';
import { ReviewModule } from './review/review.module';
import { AiAssistantModule } from './ai/ai-assistant.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CoursesModule,
    GamificationModule,
    ReviewModule,
    AiAssistantModule,
    MediaModule,
    ProgressModule,
  ],
})
export class AppModule {}
