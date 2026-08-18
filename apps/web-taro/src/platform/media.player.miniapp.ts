import Taro from '@tarojs/taro';
import type { MediaPlayer } from '@app/shared';

/** 小程序 createInnerAudioContext 媒体播放实现。 */
export function createMediaPlayer(): MediaPlayer {
  const timeCbs = new Set<(ms: number) => void>();
  const endCbs = new Set<() => void>();

  // Taro.createInnerAudioContext 需运行时创建
  let inner: any | null = null;

  const ensure = () => {
    if (!inner) {
      inner = (Taro as any).createInnerAudioContext();
      inner.onTimeUpdate(() => {
        const ms = (inner?.currentTime ?? 0) * 1000;
        timeCbs.forEach((cb) => cb(ms));
      });
      inner.onEnded(() => endCbs.forEach((cb) => cb()));
    }
    return inner;
  };

  return {
    async play(url, opts) {
      const a = ensure();
      a.src = url;
      if (opts?.startMs != null) a.startTime = opts.startMs / 1000;
      if (opts?.rate) a.playbackRate = opts.rate;
      a.play();
    },
    async pause() {
      inner?.pause();
    },
    async stop() {
      if (inner) inner.stop();
    },
    async seek(ms) {
      if (inner) inner.seek(ms / 1000);
    },
    async setRate(rate) {
      if (inner) inner.playbackRate = rate;
    },
    onTimeUpdate(cb) {
      timeCbs.add(cb);
      return () => timeCbs.delete(cb);
    },
    onEnded(cb) {
      endCbs.add(cb);
      return () => endCbs.delete(cb);
    },
    currentTimeMs() {
      return (inner?.currentTime ?? 0) * 1000;
    },
  };
}