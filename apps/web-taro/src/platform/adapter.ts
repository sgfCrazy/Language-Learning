import type {
  PlatformAdapter,
  Storage,
  SoundPlayer,
  Vibration,
  Recorder,
  WxLoginCodeProvider,
  WxScanLogin,
  NetworkClient,
  WxQrCodeSession,
} from '@app/shared';
import { NotSupportedError as NotSupported } from '@app/shared';

const storage: Storage = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set<T = unknown>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

const sound: SoundPlayer = {
  async play(name) {
    // 桩实现：Web 端可用 new Audio(`/sounds/${name}.mp3`).play()
    // eslint-disable-next-line no-console
    console.info(`[sound:web] ${name}`);
  },
  async stop() {},
};

const vibration: Vibration = {
  async vibrate() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  },
};

const recorder: Recorder = {
  async start() {
    // 实际实现使用 MediaRecorder；本期桩实现。
  },
  async stop() {
    return new Blob();
  },
};

const wxLogin: WxLoginCodeProvider = {
  async getCode() {
    throw new NotSupported('wx.login is only available in miniapp');
  },
};

const wxScanLogin: WxScanLogin = {
  async createSession(): Promise<WxQrCodeSession> {
    const res = await fetch(`${apiBase()}/auth/wx/qrcode`, { method: 'POST' });
    return res.json() as Promise<WxQrCodeSession>;
  },
  async poll(ticket) {
    const res = await fetch(`${apiBase()}/auth/wx/poll?ticket=${encodeURIComponent(ticket)}`);
    const data = (await res.json()) as { status: 'pending' } | { accessToken: string; refreshToken: string };
    if ('accessToken' in data) return data;
    return 'pending';
  },
};

const network: NetworkClient = {
  async get(url, opts) {
    const res = await fetch(`${apiBase()}${url}`, { headers: opts?.headers });
    if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
    return res.json() as Promise<unknown> as any;
  },
  async post(url, body, opts) {
    const res = await fetch(`${apiBase()}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
    return res.json() as Promise<unknown> as any;
  },
};

function apiBase(): string {
  // 由 Taro defineConstants 注入；fallback 到 localhost。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  return g.API_BASE ?? 'http://localhost:3000/api/v1';
}

export function createPlatformAdapter(): PlatformAdapter {
  return {
    platform: 'web',
    storage,
    sound,
    vibration,
    recorder,
    wxLogin,
    wxScanLogin,
    network,
  };
}
