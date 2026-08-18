import Taro from '@tarojs/taro';
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
import { NotSupportedError } from '@app/shared';
import { createMediaPlayer } from './media.player.miniapp';

const storage: Storage = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const v = Taro.getStorageSync(key);
    return (v as T) ?? null;
  },
  async set<T = unknown>(key: string, value: T): Promise<void> {
    Taro.setStorageSync(key, value);
  },
  async remove(key: string): Promise<void> {
    Taro.removeStorageSync(key);
  },
};

const sound: SoundPlayer = {
  async play(name) {
    // 小程序桩：可用 Taro.createInnerAudioContext 播放 /sounds/{name}.mp3
    // eslint-disable-next-line no-console
    console.info(`[sound:miniapp] ${name}`);
  },
  async stop() {},
};

const vibration: Vibration = {
  async vibrate() {
    Taro.vibrateShort({ type: 'light' }).catch(() => undefined);
  },
};

const recorder: Recorder = {
  async start() {
    const rm = Taro.getRecorderManager();
    rm.start({ format: 'mp3', duration: 60000 });
  },
  async stop() {
    // 简化：实际应监听 onStop 取 tempFilePath 并读取为 Blob/ArrayBuffer。
    return new Blob();
  },
};

const wxLogin: WxLoginCodeProvider = {
  async getCode() {
    const res = await Taro.login();
    return res.code;
  },
};

/** 小程序用 Taro.connectSocket 实现实时通道（统一 JSON 事件协议）。 */
function createRealtime(): RealtimeClient {
  let sock: Taro.SocketTask | null = null;
  const listeners = new Map<string, Set<(d: Record<string, unknown>) => void>>();
  const dispatch = (raw: string) => {
    let msg: { event: string; data: Record<string, unknown> };
    try {
      msg = JSON.parse(raw) as { event: string; data: Record<string, unknown> };
    } catch {
      return;
    }
    listeners.get(msg.event)?.forEach((cb) => cb(msg.data));
  };
  return {
    async connect(url: string): Promise<void> {
      const task = await Taro.connectSocket({ url });
      sock = task as Taro.SocketTask;
      await new Promise<void>((resolve, reject) => {
        task.onOpen(() => resolve());
        task.onError(() => reject(new Error('ws connect failed')));
        task.onMessage((res) => dispatch(String(res.data)));
      });
    },
    send(event, data) {
      sock?.send({ data: JSON.stringify({ event, data }) });
    },
    on(event, cb) {
      const set = listeners.get(event) ?? new Set();
      set.add(cb);
      listeners.set(event, set);
      return () => set.delete(cb);
    },
    close() {
      if (sock) sock.close({});
      sock = null;
      listeners.clear();
    },
  };
}

const wxScanLogin: WxScanLogin = {
  async createSession(): Promise<WxQrCodeSession> {
    throw new NotSupportedError('wx scan login is only available on web');
  },
  async poll() {
    throw new NotSupportedError('wx scan login is only available on web');
  },
};

function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as { message?: string | string[] };
  if (Array.isArray(value.message)) return value.message.join('；');
  return value.message || fallback;
}

const network: NetworkClient = {
  async get<T>(url: string, opts?: { headers?: Record<string, string> }): Promise<T> {
    const res = await Taro.request({
      url: `${apiBase()}${url}`,
      method: 'GET',
      header: opts?.headers ?? {},
    });
    if (res.statusCode >= 400) throw new Error(apiErrorMessage(res.data, `请求失败（${res.statusCode}）`));
    return res.data as T;
  },
  async post<T>(url: string, body: unknown, opts?: { headers?: Record<string, string> }): Promise<T> {
    const res = await Taro.request({
      url: `${apiBase()}${url}`,
      method: 'POST',
      data: body as Record<string, unknown>,
      header: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    });
    if (res.statusCode >= 400) throw new Error(apiErrorMessage(res.data, `请求失败（${res.statusCode}）`));
    return res.data as T;
  },
};

function apiBase(): string {
  // 由 Taro defineConstants 注入
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  return g.API_BASE ?? 'http://localhost:3000/api/v1';
}

export function createPlatformAdapter(): PlatformAdapter {
  return {
    platform: 'miniapp',
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
