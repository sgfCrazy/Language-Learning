import { getPlatformAdapter } from '@app/shared';
import type {
  AuthTokens,
  EmailRegisterDto,
  EmailLoginDto,
  Paginated,
  CoursePackDto,
  SentenceDto,
  CourseDto,
  PracticeSubmitDto,
  PracticeRecordDto,
} from '@app/shared';

const TOKEN_KEY = 'auth_tokens';
const OFFLINE_QUEUE_KEY = 'offline_practice_queue';

export interface StoredTokens extends AuthTokens {}

export const API_BASE = (() => {
  const g = globalThis as { API_BASE?: string };
  return g.API_BASE ?? 'http://localhost:3000/api/v1';
})();

/** 将服务端相对媒体 URL（/api/v1/...）解析为绝对地址 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url}`;
}

export async function loadTokens(): Promise<StoredTokens | null> {
  return getPlatformAdapter().storage.get<StoredTokens>(TOKEN_KEY);
}

export async function saveTokens(t: StoredTokens): Promise<void> {
  await getPlatformAdapter().storage.set(TOKEN_KEY, t);
}

export async function clearTokens(): Promise<void> {
  await getPlatformAdapter().storage.remove(TOKEN_KEY);
}

function authHeaders(tokens: StoredTokens | null): Record<string, string> {
  return tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {};
}

// 离线补传队列：断网时缓存练习记录，恢复后批量上报。
async function loadQueue(): Promise<PracticeSubmitDto[]> {
  return (await getPlatformAdapter().storage.get<PracticeSubmitDto[]>(OFFLINE_QUEUE_KEY)) ?? [];
}

async function saveQueue(q: PracticeSubmitDto[]): Promise<void> {
  await getPlatformAdapter().storage.set(OFFLINE_QUEUE_KEY, q);
}

export async function flushOfflineQueue(tokens: StoredTokens | null): Promise<void> {
  const q = await loadQueue();
  if (q.length === 0) return;
  const remaining: PracticeSubmitDto[] = [];
  for (const item of q) {
    try {
      await getPlatformAdapter().network.post<PracticeRecordDto>(
        '/progress/records',
        item,
        { headers: authHeaders(tokens) },
      );
    } catch {
      remaining.push(item);
    }
  }
  await saveQueue(remaining);
}

export const api = {
  async registerEmail(dto: EmailRegisterDto): Promise<AuthTokens> {
    return getPlatformAdapter().network.post<AuthTokens>('/auth/register/email', dto);
  },
  async loginEmail(dto: EmailLoginDto): Promise<AuthTokens> {
    return getPlatformAdapter().network.post<AuthTokens>('/auth/login/email', dto);
  },
  async loginWxMiniapp(code: string): Promise<AuthTokens> {
    return getPlatformAdapter().network.post<AuthTokens>('/auth/wx/miniapp', { code });
  },
  async refresh(refreshToken: string): Promise<AuthTokens> {
    return getPlatformAdapter().network.post<AuthTokens>('/auth/refresh', { refreshToken });
  },
  async me(tokens: StoredTokens | null): Promise<{ id: string }> {
    return getPlatformAdapter().network.get<{ id: string }>('/auth/me', {
      headers: authHeaders(tokens),
    });
  },
  async listCoursePacks(params: { level?: string; q?: string; page?: number }, tokens: StoredTokens | null): Promise<Paginated<CoursePackDto>> {
    const qs = new URLSearchParams();
    if (params.level) qs.set('level', params.level);
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', String(params.page));
    const q = qs.toString();
    return getPlatformAdapter().network.get<Paginated<CoursePackDto>>(`/course-packs${q ? `?${q}` : ''}`, {
      headers: authHeaders(tokens),
    });
  },
  async coursePackDetail(id: string, tokens: StoredTokens | null): Promise<{
    id: string; title: string; description: string; coverUrl: string;
    level: string; tags: string[]; joined: boolean; courses: CourseDto[];
  }> {
    const url = tokens ? `/course-packs/${id}/detail` : `/course-packs/${id}`;
    return getPlatformAdapter().network.get(url, { headers: authHeaders(tokens) });
  },
  async joinCoursePack(id: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post(`/course-packs/${id}/join`, {}, { headers: authHeaders(tokens) });
  },
  async getCourseSentences(id: string, tokens: StoredTokens | null): Promise<{ sentences: SentenceDto[]; progress?: { sentenceOrder: number; mode: string } }> {
    return getPlatformAdapter().network.get(`/courses/${id}`, { headers: authHeaders(tokens) });
  },
  async saveProgress(courseId: string, body: { mode: string; sentenceOrder: number; completed: boolean }, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post(`/courses/${courseId}/progress`, body, { headers: authHeaders(tokens) });
  },
  async submitPractice(body: PracticeSubmitDto, tokens: StoredTokens | null): Promise<PracticeRecordDto | { queued: true; coinsEarned?: number; rating?: string }> {
    try {
      return await getPlatformAdapter().network.post<PracticeRecordDto>(`/progress/records`, body, { headers: authHeaders(tokens) });
    } catch {
      const q = await loadQueue();
      q.push(body);
      await saveQueue(q);
      return { queued: true };
    }
  },
  async flushOffline(tokens: StoredTokens | null) {
    return flushOfflineQueue(tokens);
  },
  async getCoins(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ balance: number; items: unknown[] }>(`/gamification/coins`, { headers: authHeaders(tokens) });
  },
  async getDailyTasks(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/gamification/daily-tasks`, { headers: authHeaders(tokens) });
  },
  async getLeaderboard(period: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[]; myRank: number; myScore: number }>(`/gamification/leaderboard?period=${period}`, { headers: authHeaders(tokens) });
  },
  async getTodayReview(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ vocab: unknown[]; sentences: unknown[] }>(`/review/today`, { headers: authHeaders(tokens) });
  },
  async listVocab(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/review/vocab`, { headers: authHeaders(tokens) });
  },
  async addVocab(word: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post(`/review/vocab`, { word }, { headers: authHeaders(tokens) });
  },
  async removeVocab(id: string, tokens: StoredTokens | null) {
    // DELETE 经 network client 不支持，用 post 到一个删除端点
    return getPlatformAdapter().network.post(`/review/vocab/${id}/delete`, {}, { headers: authHeaders(tokens) });
  },
  async markVocabMastered(id: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post(`/review/vocab/${id}/master`, {}, { headers: authHeaders(tokens) });
  },
  async getAiQuota(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ freeUsed: number; freeLimit: number; balance: number }>(`/ai/quota`, { headers: authHeaders(tokens) });
  },
  async askAi(body: { question: string; context: { text: string; translation: string; tokens: { text: string; isPunctuation: boolean }[] } }, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<{ answer: string; mode: 'free' | 'billed'; billedCoins: number; quota: { freeUsed: number; freeLimit: number; balance: number } }>(`/ai/ask`, body, { headers: authHeaders(tokens) });
  },
  async speechScore(body: { sentenceText: string; durationMs: number }, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<{ score: number; feedback: string }>(`/media/speech-score`, body, { headers: authHeaders(tokens) });
  },
  async heatmap(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/progress/heatmap`, { headers: authHeaders(tokens) });
  },
  async growth(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/progress/growth`, { headers: authHeaders(tokens) });
  },
  async pkCreateRoom(body: { mode: 'public' | 'private'; coursePackId?: string; questionCount?: number }, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<Record<string, unknown>>(`/pk/rooms`, body, { headers: authHeaders(tokens) });
  },
  async pkListRooms(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/pk/rooms`, { headers: authHeaders(tokens) });
  },
  async pkJoinRoom(id: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<Record<string, unknown>>(`/pk/rooms/${id}/join`, {}, { headers: authHeaders(tokens) });
  },
  async pkJoinByCode(code: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<Record<string, unknown>>(`/pk/rooms/code/${code}/join`, {}, { headers: authHeaders(tokens) });
  },
  async pkStartMatch(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.post<{ queued: boolean; ticketId?: string; room?: Record<string, unknown> }>(`/pk/match`, {}, { headers: authHeaders(tokens) });
  },
  async pkGetRoom(id: string, tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ roomId: string; code?: string; status: string; players: { userId: string; displayName: string; score: number; correctCount: number }[] }>(`/pk/rooms/${id}`, { headers: authHeaders(tokens) });
  },
  async pkLeaderboard(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/pk/leaderboard`, { headers: authHeaders(tokens) });
  },
};
