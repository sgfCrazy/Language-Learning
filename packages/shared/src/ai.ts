/**
 * AI 助手：上下文拼装 + 安全过滤 + 配额常量。
 * 纯函数，供后端与前端共用。
 */

export const AI_FREE_DAILY_QUOTA = 2;
export const AI_COINS_PER_ASK = 50;
export const AI_MAX_ANSWER_LENGTH = 2000;

export interface AiSentenceContext {
  text: string;
  translation: string;
  tokens: { text: string; isPunctuation: boolean }[];
}

export interface AiAskDto {
  question: string;
  context: AiSentenceContext;
}

export interface AiQuotaDto {
  freeUsed: number;
  freeLimit: number;
  balance: number;
}

export interface AiAskResultDto {
  id: string;
  answer: string;
  mode: 'free' | 'billed';
  billedCoins: number;
  quota: AiQuotaDto;
}

// 敏感信息检测：邮箱/手机号/过长数字串
const PII_REGEXES: RegExp[] = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /1\d{10}/,
  /\b[3-9]\d{8,}\b/,
  /https?:\/\/[^\s]+/i,
];

/** 检测文本是否包含 PII（用户隐私字段） */
export function containsPii(text: string): boolean {
  return PII_REGEXES.some((re) => re.test(text));
}

/**
 * 仅使用句子上下文 + 用户问题拼装发给 LLM 的 prompt。
 * 若包含 PII 返回 null（拒绝发送）。
 */
export function buildAiPrompt(ask: AiAskDto): string | null {
  const question = ask.question.trim();
  if (!question || containsPii(question)) return null;
  const text = ask.context.text.trim();
  if (!text || containsPii(text)) return null;
  const translation = ask.context.translation.trim();
  if (translation && containsPii(translation)) return null;
  const vocab = ask.context.tokens.map((t) => t.text).join(' ');
  if (containsPii(vocab)) return null;

  return [
    `当前学到的英文句子：${text}`,
    translation ? `中文释义：${translation}` : '',
    vocab ? `词块：${vocab}` : '',
    `学习者的提问：${question}`,
    '请用中文简要解释，帮助语言学习者理解。',
  ]
    .filter(Boolean)
    .join('\n');
}

/** 基础安全过滤：截断长度、去除可能注入的敏感字符 */
export function filterAiAnswer(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  return cleaned.length > AI_MAX_ANSWER_LENGTH
    ? `${cleaned.slice(0, AI_MAX_ANSWER_LENGTH)}…`
    : cleaned.trim();
}

/** 计算今日是否剩余免费额度 */
export function remainingFree(freeUsedToday: number): number {
  return Math.max(0, AI_FREE_DAILY_QUOTA - freeUsedToday);
}