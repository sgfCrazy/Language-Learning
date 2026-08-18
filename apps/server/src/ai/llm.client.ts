import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const AI_LLM_CLIENT = Symbol('AI_LLM_CLIENT');

export interface AiAskInput {
  prompt: string;
}

export interface AiLlmClient {
  chat(input: AiAskInput): Promise<string>;
}

/**
 * OpenAI 兼容协议实现的 LLM 客户端（默认智谱 GLM）。
 * 未配置 API_KEY 时走 fallback，不触网。
 */
@Injectable()
export class OpenAiLlmClient implements AiLlmClient, OnModuleInit {
  private readonly logger = new Logger(OpenAiLlmClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly provider: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('LLM_BASE_URL') ?? 'https://open.bigmodel.cn/api/paas/v4';
    this.apiKey = config.get<string>('LLM_API_KEY') ?? '';
    this.model = config.get<string>('LLM_MODEL') ?? 'glm-4-flash';
    this.provider = config.get<string>('LLM_PROVIDER') ?? 'glm';
  }

  onModuleInit() {
    if (!this.apiKey) {
      this.logger.warn('LLM_API_KEY 未配置，AI 助手将返回 fallback 提示');
    }
  }

  async chat(input: AiAskInput): Promise<string> {
    if (!this.apiKey) {
      return 'AI 服务暂未配置，请稍后再试。（服务端缺少 LLM_API_KEY）';
    }
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: '你是语言学习助手，回答简洁、准确、友好。' },
            { role: 'user', content: input.prompt },
          ],
          max_tokens: 800,
        }),
      });
      if (!res.ok) {
        this.logger.error(`LLM request failed: ${res.status} ${await res.text()}`);
        return 'AI 服务暂时不可用，请稍后再试。';
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content ?? '（无回答）';
    } catch (err) {
      this.logger.error(`LLM request error: ${String(err)}`);
      return 'AI 服务暂时不可用，请稍后再试。';
    }
  }
}