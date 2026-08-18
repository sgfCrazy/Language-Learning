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
  async submitPractice(body: PracticeSubmitDto, tokens: StoredTokens | null): Promise<PracticeRecordDto | { queued: true }> {
    try {
      return await getPlatformAdapter().network.post<PracticeRecordDto>(`/progress/records`, body, { headers: authHeaders(tokens) });
    } catch {
      // 离线：入队待补传
      const q = await loadQueue();
      q.push(body);
      await saveQueue(q);
      return { queued: true };
    }
  },
  async flushOffline(tokens: StoredTokens | null) {
    return flushOfflineQueue(tokens);
  },
  async heatmap(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/progress/heatmap`, { headers: authHeaders(tokens) });
  },
  async growth(tokens: StoredTokens | null) {
    return getPlatformAdapter().network.get<{ items: unknown[] }>(`/progress/growth`, { headers: authHeaders(tokens) });
  },
};
