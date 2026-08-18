import type {
  PlatformAdapter,
  Storage,
  SoundPlayer,
  Vibration,
  Recorder,
  RealtimeClient,
  WxLoginCodeProvider,
  WxScanLogin,
  NetworkClient,
  WxQrCodeSession,
} from '@app/shared';
import { NotSupportedError as NotSupported } from '@app/shared';
import { createMediaPlayer } from './media.player';

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
  async start() {},
  async stop() {
    return new Blob();
  },
};

/** Web 用原生 WebSocket 实现实时通道（统一 JSON 事件协议）。 */
function createRealtime(): RealtimeClient {
  let ws: WebSocket | null = null;
  const listeners = new Map<string, Set<(d: Record<string, unknown>) => void>>();
  const handle = (ev: MessageEvent) => {
    if (typeof ev.data !== 'string') return;
    let msg: { event: string; data: Record<string, unknown> };
    try {
      msg = JSON.parse(ev.data) as { event: string; data: Record<string, unknown> };
    } catch {
      return;
    }
    listeners.get(msg.event)?.forEach((cb) => cb(msg.data));
  };
  return {
    connect(url) {
      return new Promise((resolve, reject) => {
        ws = new WebSocket(url);
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('ws connect failed'));
        ws.onmessage = handle;
      });
    },
    send(event, data) {
      ws?.readyState === 1 && ws.send(JSON.stringify({ event, data }));
    },
    on(event, cb) {
      const set = listeners.get(event) ?? new Set();
      set.add(cb);
      listeners.set(event, set);
      return () => set.delete(cb);
    },
    close() {
      ws?.close();
      ws = null;
      listeners.clear();
    },
  };
}

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

function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as { message?: string | string[] };
  if (Array.isArray(value.message)) return value.message.join('；');
  return value.message || fallback;
}

const network: NetworkClient = {
  async get(url, opts) {
    const res = await fetch(`${apiBase()}${url}`, { headers: opts?.headers });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(apiErrorMessage(payload, `请求失败（${res.status}）`));
    }
    return res.json() as Promise<unknown> as any;
  },
  async post(url, body, opts) {
    const res = await fetch(`${apiBase()}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(apiErrorMessage(payload, `请求失败（${res.status}）`));
    }
    return res.json() as Promise<unknown> as any;
  },
};

function apiBase(): string {
  const g = globalThis as unknown as Record<string, string | undefined>;
  return g.API_BASE ?? import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api/v1';
}

export function createPlatformAdapter(): PlatformAdapter {
  return {
    platform: 'web',
    storage,
    sound,
    vibration,
    recorder,
    media: createMediaPlayer(),
    realtime: createRealtime(),
    wxLogin,
    wxScanLogin,
    network,
  };
}