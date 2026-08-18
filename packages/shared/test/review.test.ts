import { describe, it, expect } from 'vitest';
import { updateReviewState, isMastered, isDue, INITIAL_REVIEW } from '../src/review.js';

describe('updateReviewState (SM-2 variant)', () => {
  it('答对延长间隔', () => {
    const s1 = updateReviewState(INITIAL_REVIEW, true, 1000000);
    expect(s1.reps).toBe(1);
    expect(s1.interval).toBe(1);

    const s2 = updateReviewState(s1, true, 2000000);
    expect(s2.reps).toBe(2);
    expect(s2.interval).toBeGreaterThan(s1.interval);
  });

  it('答错重置 reps 和 interval', () => {
    const s1 = updateReviewState(INITIAL_REVIEW, true);
    const s2 = updateReviewState(s1, false);
    expect(s2.reps).toBe(0);
    expect(s2.interval).toBe(1);
    expect(s2.ease).toBeLessThan(s1.ease);
  });

  it('ease 有上下限', () => {
    let s = INITIAL_REVIEW;
    for (let i = 0; i < 20; i++) s = updateReviewState(s, true);
    expect(s.ease).toBeLessThanOrEqual(3.0);

    let s2 = INITIALIAL_REVIEW;
    for (let i = 0; i < 20; i++) s2 = updateReviewState(s2, false);
    expect(s2.ease).toBeGreaterThanOrEqual(1.3);
  });
});

describe('isMastered', () => {
  it('reps>=5 且 interval>=21 为掌握', () => {
    expect(isMastered({ interval: 21, ease: 2.5, reps: 5, dueAt: 0 })).toBe(true);
  });
  it('reps<5 不算掌握', () => {
    expect(isMastered({ interval: 30, ease: 2.5, reps: 4, dueAt: 0 })).toBe(false);
  });
});

describe('isDue', () => {
  it('dueAt <= now 为到期', () => {
    expect(isDue({ interval: 1, ease: 2.5, reps: 0, dueAt: 1000 }, 2000)).toBe(true);
  });
  it('dueAt > now 未到期', () => {
    expect(isDue({ interval: 1, ease: 2.5, reps: 0, dueAt: 3000 }, 2000)).toBe(false);
  });
});

// 修复拼写错误引用
const INITIALIAL_REVIEW = INITIAL_REVIEW;
