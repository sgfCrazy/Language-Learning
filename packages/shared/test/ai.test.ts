import { describe, expect, it } from 'vitest';
import {
  AI_COINS_PER_ASK,
  AI_FREE_DAILY_QUOTA,
  AI_MAX_ANSWER_LENGTH,
  buildAiPrompt,
  containsPii,
  filterAiAnswer,
  remainingFree,
} from '../src/ai';

describe('ai.helpers', () => {
  it('free quota math', () => {
    expect(AI_FREE_DAILY_QUOTA).toBe(2);
    expect(remainingFree(0)).toBe(2);
    expect(remainingFree(2)).toBe(0);
    expect(remainingFree(5)).toBe(0);
  });

  it('coin cost constant', () => {
    expect(AI_COINS_PER_ASK).toBeGreaterThan(0);
  });

  it('builds prompt with sentence context and question', () => {
    const prompt = buildAiPrompt({
      question: '这个词还能怎么用',
      context: {
        text: 'The cat sleeps on the mat.',
        translation: '猫睡在垫子上。',
        tokens: [{ text: 'The', isPunctuation: false }, { text: 'mat', isPunctuation: false }],
      },
    });
    expect(prompt).toBeTruthy();
    expect(prompt).toContain('The cat sleeps on the mat.');
    expect(prompt).toContain('猫睡在垫子上。');
    expect(prompt).toContain('这个词还能怎么用');
    expect(prompt).not.toContain('user@example.com');
  });

  it('rejects empty question', () => {
    expect(
      buildAiPrompt({ question: '  ', context: { text: 'Hi.', translation: '', tokens: [] } }),
    ).toBeNull();
  });

  it('rejects PII in question', () => {
    expect(
      buildAiPrompt({
        question: '请处理 mymail@x.com',
        context: { text: 'Hi.', translation: '', tokens: [] },
      }),
    ).toBeNull();
  });

  it('rejects PII in sentence text', () => {
    expect(
      buildAiPrompt({
        question: '怎么理解',
        context: { text: 'Call 13812345678 please.', translation: '', tokens: [] },
      }),
    ).toBeNull();
  });

  it('filters control chars and trims', () => {
    expect(filterAiAnswer('  hello\u0000world  ')).toBe('helloworld');
    expect(containsPii('plain text')).toBe(false);
    expect(containsPii('a@b.com')).toBe(true);
  });

  it('truncates over-long answer', () => {
    const long = 'x'.repeat(3000);
    const out = filterAiAnswer(long);
    expect(out.length).toBeLessThanOrEqual(AI_MAX_ANSWER_LENGTH + 1);
  });
});