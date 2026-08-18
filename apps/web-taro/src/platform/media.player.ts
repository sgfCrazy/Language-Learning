import type { MediaPlayer } from '@app/shared';

/** Web HTML5 Audio 媒体播放实现。 */
export function createMediaPlayer(): MediaPlayer {
  let audio: HTMLAudioElement | null = null;
  const timeCbs = new Set<(ms: number) => void>();
  const endCbs = new Set<() => void>();

  const ensure = () => {
    if (!audio) {
      audio = new Audio();
      audio.addEventListener('timeupdate', () => {
        const ms = (audio?.currentTime ?? 0) * 1000;
        timeCbs.forEach((cb) => cb(ms));
      });
      audio.addEventListener('ended', () => endCbs.forEach((cb) => cb()));
    }
    return audio;
  };

  return {
    async play(url, opts) {
      const a = ensure();
      a.src = url;
      if (opts?.rate) a.playbackRate = opts.rate;
      await a.play();
      if (opts?.startMs != null && opts.startMs > 0) {
        a.currentTime = opts.startMs / 1000;
      }
    },
    async pause() {
      audio?.pause();
    },
    async stop() {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    },
    async seek(ms) {
      if (audio) audio.currentTime = ms / 1000;
    },
    async setRate(rate) {
      if (audio) audio.playbackRate = rate;
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
      return (audio?.currentTime ?? 0) * 1000;
    },
  };
}