/**
 * PK 对战统一事件协议与纯函数。
 * Web（原生 WebSocket）与小程序（Taro.connectSocket）共用同一 JSON 协议。
 */

export const PK_FIRST_CORRECT_POINTS = 10;
export const PK_SECOND_CORRECT_POINTS = 5;
export const PK_DEFAULT_QUESTION_COUNT = 5;
export const PK_DEFAULT_TIME_LIMIT_MS = 15000;

export type PkRoomMode = 'public' | 'private';
export type PkRoomStatus = 'waiting' | 'ready' | 'playing' | 'finished';

export interface PkQuestion {
  questionIndex: number;
  translation: string;
  tokens: { id: string; text: string }[];
  timeLimitMs: number;
}

export interface PkPlayer {
  userId: string;
  displayName: string;
  score: number;
  correctCount: number;
  connected: boolean;
}

export interface PkRoomSnapshot {
  roomId: string;
  code?: string;
  mode: PkRoomMode;
  status: PkRoomStatus;
  questionCount: number;
  coursePackId?: string;
  players: PkPlayer[];
}

export interface PkResult {
  roomId: string;
  winnerId: string | null;
  myScore: number;
  opponentScore: number;
  myCorrect: number;
  opponentCorrect: number;
  pointsDelta: number;
}

/** 服务端按到达顺序判定：先正确 +10，后正确 +5 */
export function scorePkAnswer(arrivalOrder: number): number {
  return arrivalOrder === 0 ? PK_FIRST_CORRECT_POINTS : PK_SECOND_CORRECT_POINTS;
}

/** 从候选句子里按题数均匀抽题（确定性抽样） */
export function pickPkQuestions<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const step = items.length / count;
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(items[Math.floor(i * step + step / 2)]!);
  }
  return out;
}

/** 生成 6 位数字房间号 */
export function genPkCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 结果积分增减：胜 +20，平 0，负 -10 */
export function pkPointsDelta(won: boolean, draw: boolean): number {
  if (draw) return 0;
  return won ? 20 : -10;
}