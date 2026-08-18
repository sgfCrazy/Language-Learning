import { describe, it, expect } from 'vitest';
import { scoreSentence, rateByScoreRate } from '../src/scoring.js';
import { Rating } from '../src/enum/index.js';

describe('scoreSentence', () => {
  it('零错误快速完成给最高档', () => {
    const s = scoreSentence({ correctRate: 1, durationMs: 1000, targetMs: 2000, attempts: 0 });
    expect(s).toBeGreaterThanOrEqual(88);
  });

  it('多次错误降低评分', () => {
    const s = scoreSentence({ correctRate: 1, durationMs: 1000, targetMs: 2000, attempts: 5 });
    expect(s).toBeLessThan(88);
  });
});

describe('rateByScoreRate', () => {
  it('≥95% 为 SSS', () => {
    expect(rateByScoreRate(0.95)).toBe(Rating.SSS);
    expect(rateByScoreRate(1)).toBe(Rating.SSS);
  });
  it('90% 就高 SS', () => {
    expect(rateByScoreRate(0.9)).toBe(Rating.SS);
  });
  it('60% 为 B', () => {
    expect(rateByScoreRate(0.6)).toBe(Rating.B);
  });
  it('<60% 为 C', () => {
    expect(rateByScoreRate(0.5)).toBe(Rating.C);
  });
});
