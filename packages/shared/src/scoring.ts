import { Rating } from './enum/index';

/**
 * 按句评分纯函数（task PE-005）。
 * 输入：正确率（0-1）、用时（ms）、目标用时（ms）、尝试次数。
 * 输出：0-100 分。
 */
export function scoreSentence(args: {
  correctRate: number;
  durationMs: number;
  targetMs: number;
  attempts: number;
}): number {
  const { correctRate, durationMs, targetMs, attempts } = args;
  const accuracyScore = correctRate * 70;
  const speedRatio = targetMs > 0 ? Math.min(targetMs / Math.max(durationMs, 1), 1) : 1;
  const speedScore = speedRatio * 20;
  const attemptPenalty = Math.min(attempts, 5) * 2;
  const raw = accuracyScore + speedScore - attemptPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 练习结算评级（task GM-002），按得分率（0-1）映射 C→SSS。
 * 边界按就高原则。
 */
export function rateByScoreRate(rate: number): Rating {
  if (rate >= 0.95) return Rating.SSS;
  if (rate >= 0.9) return Rating.SS;
  if (rate >= 0.85) return Rating.S;
  if (rate >= 0.75) return Rating.A;
  if (rate >= 0.6) return Rating.B;
  return Rating.C;
}
