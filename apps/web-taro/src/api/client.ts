import { getPlatformAdapter } from '@app/shared';
import type {
  AuthTokens,
  EmailRegisterDto,
  EmailLoginDto,
} from '@app/shared';

const TOKEN_KEY = 'auth_tokens';

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
};
