/**
 * 平台适配层接口定义。
 *
 * 业务代码禁止直接调用浏览器 API 或微信小程序专有 API（如 `wx.*`、`Taro.*` 的副作用调用）。
 * 一律通过本接口在运行期注入的实现访问平台能力。Web 与小程序各自提供实现。
 */

export type Platform = 'web' | 'miniapp';

export interface Storage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export type SoundName = 'correct' | 'wrong' | 'perfect' | 'great' | 'complete';

export interface SoundPlayer {
  play(name: SoundName): Promise<void>;
  stop(): Promise<void>;
}

export interface Vibration {
  vibrate(ms?: number): Promise<void>;
}

export interface Recorder {
  start(): Promise<void>;
  stop(): Promise<Blob>;
}

export interface WxLoginCodeProvider {
  /** 小程序端获取 wx.login 的 code；Web 端实现应抛出 NotSupported。 */
  getCode(): Promise<string>;
}

export interface WxQrCodeSession {
  ticket: string;
  qrUrl: string;
}

export interface WxScanLogin {
  /** Web 端发起扫码：返回 ticket 与二维码 URL；小程序端实现应抛出 NotSupported。 */
  createSession(): Promise<WxQrCodeSession>;
  /** 轮询扫码结果；返回 tokens 或 'pending'。 */
  poll(ticket: string): Promise<'pending' | { accessToken: string; refreshToken: string }>;
}

export interface NetworkClient {
  get<T>(url: string, opts?: { headers?: Record<string, string> }): Promise<T>;
  post<T>(url: string, body: unknown, opts?: { headers?: Record<string, string> }): Promise<T>;
}

export interface PlatformAdapter {
  platform: Platform;
  storage: Storage;
  sound: SoundPlayer;
  vibration: Vibration;
  recorder: Recorder;
  wxLogin: WxLoginCodeProvider;
  wxScanLogin: WxScanLogin;
  network: NetworkClient;
}

let _adapter: PlatformAdapter | null = null;

export function setPlatformAdapter(adapter: PlatformAdapter): void {
  _adapter = adapter;
}

export function getPlatformAdapter(): PlatformAdapter {
  if (!_adapter) {
    throw new Error('Platform adapter has not been set. Call setPlatformAdapter() at app bootstrap.');
  }
  return _adapter;
}

export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotSupportedError';
  }
}
