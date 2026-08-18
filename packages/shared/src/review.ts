/**
 * SM-2 变体复习调度算法。
 * 纯函数，供后端与前端共用。
 */

export interface ReviewState {
  interval: number; // 天
  ease: number; // 难度系数
  reps: number; // 连续答对次数
  dueAt: number; // ms 时间戳
}

export const INITIAL_REVIEW: ReviewState = {
  interval: 1,
  ease: 2.5,
  reps: 0,
  dueAt: Date.now(),
};

const DAY_MS = 86400 * 1000;
const MAX_EASE = 3.0;
const MIN_EASE = 1.3;

/**
 * 根据答题结果更新复习状态。
 * @param correct 是否答对
 * @param now 当前时间戳(ms)
 * @returns 新的 ReviewState
 */
export function updateReviewState(prev: ReviewState, correct: boolean, now = Date.now()): ReviewState {
  if (correct) {
    const ease = Math.min(MAX_EASE, prev.ease * 1.1);
    const reps = prev.reps + 1;
    const interval = reps === 1 ? 1 : Math.round(prev.interval * ease);
    const dueAt = now + interval * DAY_MS;
    return { interval, ease, reps, dueAt };
  } else {
    const ease = Math.max(MIN_EASE, prev.ease * 0.8);
    return { interval: 1, ease, reps: 0, dueAt: now + DAY_MS };
  }
}

/** 判断是否已掌握：连续答对 >= 5 次 且间隔 >= 21 天 */
export function isMastered(state: ReviewState): boolean {
  return state.reps >= 5 && state.interval >= 21;
}

/** 判断是否到期需要复习 */
export function isDue(state: ReviewState, now = Date.now()): boolean {
  return state.dueAt <= now;
}
