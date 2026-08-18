/**
 * 口语测评：确定性评分桩（生产接入第三方语音评测 API）。
 * 仅按句子文本哈希 + 录音时长给 0-100 分，便于开发期演示与测试。
 */

export interface SpeakingResult {
  score: number; // 0-100
  feedback: string; // 简短反馈
}

const FEEDBACK = [
  [90, 100, 'Excellent! 发音非常清晰。'],
  [75, 89, 'Good job! 少数字词发音可再打磨。'],
  [60, 74, 'Not bad. 建议放慢速度跟读几遍。'],
  [0, 59, 'Keep practicing! 可以对照原音多听几遍。'],
] as const;

function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * 确定性评分：基础分由文本哈希映射到 [62, 98)，再按时长惩罚。
 * @param text 目标句
 * @param durationMs 录音时长（越短越接近目标句，过长认为不流利）
 */
export function evaluateSpeaking(text: string, durationMs: number): SpeakingResult {
  const base = 62 + (hashText(text) % 37); // 62-98
  const expectedMs = Math.max(800, text.length * 260);
  let score = base;
  if (durationMs > 0) {
    const ratio = durationMs / expectedMs;
    if (ratio > 1.6) score -= Math.min(20, (ratio - 1.6) * 40);
    else if (ratio < 0.5) score -= 8;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const fb = FEEDBACK.find(([lo, hi]) => score >= lo && score <= hi)![2];
  return { score, feedback: fb };
}