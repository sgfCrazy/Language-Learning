import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { AI_LLM_CLIENT, OpenAiLlmClient } from './llm.client';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [PrismaModule, GamificationModule],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    {
      provide: AI_LLM_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new OpenAiLlmClient(config),
    },
  ],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}