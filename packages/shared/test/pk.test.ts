import { describe, expect, it } from 'vitest';
import {
  PK_FIRST_CORRECT_POINTS,
  PK_SECOND_CORRECT_POINTS,
  genPkCode,
  pickPkQuestions,
  pkPointsDelta,
  scorePkAnswer,
} from '../src/pk';

describe('pk.helpers', () => {
  it('scores by arrival order', () => {
    expect(scorePkAnswer(0)).toBe(PK_FIRST_CORRECT_POINTS);
    expect(scorePkAnswer(1)).toBe(PK_SECOND_CORRECT_POINTS);
    expect(scorePkAnswer(3)).toBe(PK_SECOND_CORRECT_POINTS);
  });

  it('picks deterministic spread when more items than count', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const picked = pickPkQuestions(items, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
  });

  it('returns all when fewer items', () => {
    const picked = pickPkQuestions([1, 2, 3], 5);
    expect(picked).toEqual([1, 2, 3]);
  });

  it('generates 6-digit numeric code', () => {
    const code = genPkCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('points delta', () => {
    expect(pkPointsDelta(true, false)).toBe(20);
    expect(pkPointsDelta(false, false)).toBe(-10);
    expect(pkPointsDelta(false, true)).toBe(0);
  });
});