import { create } from 'zustand';
import { api, loadTokens, saveTokens, clearTokens, type StoredTokens } from '../api/client';

interface AuthState {
  tokens: StoredTokens | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
  init: () => Promise<void>;
  registerEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginWxMiniapp: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  tokens: null,
  userId: null,
  loading: false,
  error: null,

  async init() {
    const stored = await loadTokens();
    if (stored) {
      try {
        const me = await api.me(stored);
        set({ tokens: stored, userId: me.id });
      } catch {
        // access token 可能过期，尝试 refresh
        try {
          const refreshed = await api.refresh(stored.refreshToken);
          await saveTokens(refreshed);
          const me = await api.me(refreshed);
          set({ tokens: refreshed, userId: me.id });
        } catch {
          await clearTokens();
          set({ tokens: null, userId: null });
        }
      }
    }
  },

  async registerEmail(email, password, displayName) {
    set({ loading: true, error: null });
    try {
      const tokens = await api.registerEmail({ email, password, displayName });
      await saveTokens(tokens);
      const me = await api.me(tokens);
      set({ tokens, userId: me.id, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async loginEmail(email, password) {
    set({ loading: true, error: null });
    try {
      const tokens = await api.loginEmail({ email, password });
      await saveTokens(tokens);
      const me = await api.me(tokens);
      set({ tokens, userId: me.id, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async loginWxMiniapp() {
    set({ loading: true, error: null });
    try {
      const { getPlatformAdapter } = await import('@app/shared');
      const code = await getPlatformAdapter().wxLogin.getCode();
      const tokens = await api.loginWxMiniapp(code);
      await saveTokens(tokens);
      const me = await api.me(tokens);
      set({ tokens, userId: me.id, loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },

  async logout() {
    await clearTokens();
    set({ tokens: null, userId: null });
  },
}));

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().tokens;
}
