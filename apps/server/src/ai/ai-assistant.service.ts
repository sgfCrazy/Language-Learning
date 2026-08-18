import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { AI_LLM_CLIENT, AiLlmClient } from './llm.client';
import {
  AI_COINS_PER_ASK,
  AiAskDto,
  AiAskResultDto,
  AiQuotaDto,
  buildAiPrompt,
  filterAiAnswer,
  remainingFree,
} from '@app/shared';

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    @Inject(AI_LLM_CLIENT) private readonly llm: AiLlmClient,
  ) {}

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  async getQuota(userId: string): Promise<AiQuotaDto> {
    const start = this.startOfToday();
    const [freeUsed, balance] = await Promise.all([
      this.prisma.aiAskLog.count({ where: { userId, mode: 'free', createdAt: { gte: start } } }),
      this.gamification.getBalance(userId),
    ]);
    return { freeUsed, freeLimit: 2, balance };
  }

  async ask(userId: string, dto: AiAskDto): Promise<AiAskResultDto> {
    const question = dto.question?.trim();
    if (!question) throw new BadRequestException('question 不能为空');

    const prompt = buildAiPrompt({ question, context: dto.context });
    if (prompt === null) throw new BadRequestException('提问包含敏感信息，已拒绝');

    const quota = await this.getQuota(userId);
    const free = remainingFree(quota.freeUsed) > 0;
    let billedCoins = 0;
    let rawAnswer: string;

    if (free) {
      rawAnswer = await this.llm.chat({ prompt });
    } else {
      if (quota.balance < AI_COINS_PER_ASK) {
        throw new ForbiddenException('钻石余额不足，请先通过练习赚取金币');
      }
      billedCoins = AI_COINS_PER_ASK;
      rawAnswer = await this.llm.chat({ prompt });
    }

    const contextJson = JSON.stringify({
      text: dto.context.text,
      translation: dto.context.translation,
      tokens: dto.context.tokens,
    });

    const log = await this.prisma.aiAskLog.create({
      data: {
        userId,
        question,
        context: contextJson,
        answer: rawAnswer,
        mode: free ? 'free' : 'billed',
        billedCoins,
      },
    });
    if (!free && billedCoins > 0) {
      await this.gamification.spendCoins(userId, billedCoins, 'ai_billed', log.id);
    }

    const answer = filterAiAnswer(rawAnswer);
    const afterQuota = await this.getQuota(userId);
    return {
      id: log.id,
      answer,
      mode: free ? 'free' : 'billed',
      billedCoins,
      quota: afterQuota,
    };
  }
}