import { CourseLevel, CourseType, PracticeMode } from '../enum/index';

export interface TokenDto {
  id: string;
  text: string;
  isPunctuation: boolean;
}

export interface SentenceDto {
  id: string;
  courseId: string;
  order: number;
  text: string;
  translation: string;
  tokens: TokenDto[];
  mediaUrl?: string | null;
  startMs?: number | null;
  endMs?: number | null;
}

export interface CourseDto {
  id: string;
  coursePackId: string;
  title: string;
  type: CourseType;
  sentenceCount: number;
  userProgress?: number;
}

export interface CoursePackDto {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  level: CourseLevel;
  tags: string[];
  joined?: boolean;
  overallProgress?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface PracticeRecordDto {
  id: string;
  userId: string;
  courseId: string;
  sentenceId: string;
  mode: PracticeMode;
  correct: boolean;
  durationMs: number;
  attempts: number;
  score: number;
  clientTimestamp: number;
  createdAt: string;
}

export interface PracticeSubmitDto {
  courseId: string;
  sentenceId: string;
  mode: PracticeMode;
  correct: boolean;
  durationMs: number;
  attempts: number;
  score: number;
  maxCombo?: number;
  scoreRate?: number;
  clientTimestamp: number;
}

export interface CourseProgressDto {
  coursePackId: string;
  courseId: string;
  mode: PracticeMode;
  sentenceOrder: number;
  completed: boolean;
  updatedAt: string;
}

export interface HeatmapDay {
  date: string;
  durationMs: number;
  count: number;
}

export interface GrowthStatsDto {
  totalDays: number;
  totalDurationMs: number;
  currentStreak: number;
  totalQuestions: number;
  accuracy: number;
}

export interface CourseSentenceDetailDto {
  sentenceId: string;
  order: number;
  correct: boolean;
  durationMs: number;
  attempts: number;
  score: number;
  lastPracticedAt: string | null;
}

export interface EmailRegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface EmailLoginDto {
  email: string;
  password: string;
}

export interface WxMiniappLoginDto {
  code: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface CoinTransactionDto {
  id: string;
  amount: number;
  balanceAfter: number;
  source: string;
  refId: string | null;
  createdAt: string;
}

export interface DailyTaskDto {
  id: string;
  type: string;
  target: number;
  reward: number;
  completed: boolean;
  progress: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
}

export interface PracticeSettlementDto {
  recordId: string;
  coinsEarned: number;
  balanceAfter: number;
  rating: string;
}
