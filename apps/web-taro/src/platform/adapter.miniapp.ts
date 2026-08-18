import Taro from '@tarojs/taro';
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
import { NotSupportedError } from '@app/shared';

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

const wxScanLogin: WxScanLogin = {
  async createSession(): Promise<WxQrCodeSession> {
    throw new NotSupportedError('wx scan login is only available on web');
  },
  async poll() {
    throw new NotSupportedError('wx scan login is only available on web');
  },
};

const network: NetworkClient = {
  async get<T>(url: string, opts?: { headers?: Record<string, string> }): Promise<T> {
    const res = await Taro.request({
      url: `${apiBase()}${url}`,
      method: 'GET',
      header: opts?.headers ?? {},
    });
    return res.data as T;
  },
  async post<T>(url: string, body: unknown, opts?: { headers?: Record<string, string> }): Promise<T> {
    const res = await Taro.request({
      url: `${apiBase()}${url}`,
      method: 'POST',
      data: body as Record<string, unknown>,
      header: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
    });
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
    wxLogin,
    wxScanLogin,
    network,
  };
}
