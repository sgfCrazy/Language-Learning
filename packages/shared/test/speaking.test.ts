import { describe, expect, it } from 'vitest';
import { evaluateSpeaking } from '../src/speaking';

describe('evaluateSpeaking', () => {
  it('returns score within 0-100', () => {
    const r = evaluateSpeaking('The cat sleeps on the mat.', 1800);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.feedback.length).toBeGreaterThan(0);
  });

  it('deterministic for same input', () => {
    const a = evaluateSpeaking('Hello world.', 1200);
    const b = evaluateSpeaking('Hello world.', 1200);
    expect(a).toEqual(b);
  });

  it('penalizes overly long duration', () => {
    const fast = evaluateSpeaking('Hello world.', 1000);
    const slow = evaluateSpeaking('Hello world.', 15000);
    expect(slow.score).toBeLessThanOrEqual(fast.score);
  });

  it('produces varied scores across different texts', () => {
    const scores = new Set([
      evaluateSpeaking('This is a short sentence.', 1200).score,
      evaluateSpeaking('Another different sentence here.', 1200).score,
      evaluateSpeaking('A third distinct phrase to check.', 1200).score,
    ]);
    expect(scores.size).toBeGreaterThan(1);
  });
});