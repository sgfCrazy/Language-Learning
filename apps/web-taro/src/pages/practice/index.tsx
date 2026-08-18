import { useEffect, useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import type { SentenceDto, SoundName } from '@app/shared';
import { PracticeMode, getPlatformAdapter, scoreSentence, rateByScoreRate } from '@app/shared';
import { api, resolveMediaUrl } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import AiAssistantPanel from '../../components/AiAssistantPanel';

/**
 * 练习页：支持 中译英 / 听写 / 听力 / 口语测评 四种模式。
 * - zh_to_en / dictation：累加式拼接词块，错误即时反馈，连击结算。
 * - listening：盲听 → 慢听 → 看字幕 三阶段磨耳朵。
 * - speaking：跟读录音 → 0-100 发音评分。
 * 媒体播放一律走 PlatformAdapter.media（Web HTML5 / 小程序 innerAudio）。
 */
export default function Practice() {
  const router = useRouter();
  const courseId = (router.params.courseId as string) ?? '';
  const courseType = (router.params.type as string) ?? 'text';
  const tokens = useAuthStore((s) => s.tokens);

  const { data, isLoading } = useQuery({
    queryKey: ['course-sentences', courseId],
    queryFn: () => api.getCourseSentences(courseId, tokens),
  });

  const sentences = data?.sentences ?? [];
  const startOrder = data?.progress?.sentenceOrder ?? 0;
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mode, setMode] = useState<PracticeMode>(
    courseType === 'video' ? PracticeMode.VideoWatch : courseType === 'music' ? PracticeMode.Listening : PracticeMode.ZhToEn,
  );

  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const [listenStage, setListenStage] = useState(0);
  const [recording, setRecording] = useState(false);
  const [speech, setSpeech] = useState<{ score: number; feedback: string } | null>(null);

  const [settlement, setSettlement] = useState<{ rating: string; coins: number } | null>(null);

  useEffect(() => {
    if (sentences.length > 0) {
      setIdx(Math.min(startOrder, sentences.length - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences.length]);

  const current: SentenceDto | undefined = sentences[idx];
  const tokensArr = current?.tokens ?? [];
  const built = useMemo(() => tokensArr.slice(0, step).map((t) => t.text).join(' '), [tokensArr, step]);
  const candidates = useMemo(() => {
    const remaining = tokensArr.filter((_, i) => i >= step);
    return [...remaining].sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [tokensArr, step]);

  useEffect(() => {
    const media = getPlatformAdapter().media;
    media.pause().catch(() => undefined);
    setListenStage(0);
    setSpeech(null);
  }, [idx, mode]);

  if (isLoading) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">✏️</View><Text className="loading-text">加载中…</Text></View>
      </View>
    );
  }
  if (!current) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">📭</View><Text className="loading-text">无内容</Text></View>
      </View>
    );
  }

  const expected = tokensArr[step];

  const playSound = (name: SoundName) => {
    getPlatformAdapter().sound.play(name).catch(() => undefined);
  };

  const playCurrent = (rate = 1, startMs?: number) => {
    const url = resolveMediaUrl(current.mediaUrl);
    if (!url) {
      Taro.showToast({ title: '该课程无音频', icon: 'none' });
      return;
    }
    const media = getPlatformAdapter().media;
    media.stop().catch(() => undefined);
    void media.play(url, { startMs: startMs ?? current.startMs ?? 0, rate });
    if (current.endMs) {
      const off = media.onTimeUpdate((ms) => {
        if (ms >= (current.endMs ?? 0)) {
          off();
          media.pause().catch(() => undefined);
        }
      });
    }
  };

  const onPick = (text: string) => {
    if (!expected) return;
    if (text === expected.text) {
      setWrong(false);
      const nextStep = step + 1;
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      if (nextStep >= tokensArr.length) {
        playSound(newCombo >= 10 ? 'perfect' : 'correct');
        finishSentence(true, attempts, newCombo);
      } else {
        playSound(newCombo >= 10 ? 'great' : 'correct');
        setStep(nextStep);
      }
    } else {
      setWrong(true);
      setAttempts((a) => a + 1);
      setCombo(0);
      playSound('wrong');
      getPlatformAdapter().vibration.vibrate().catch(() => undefined);
    }
  };

  const finishSentence = async (correct: boolean, attemptCount: number, comboPeak: number) => {
    const score = scoreSentence({
      correctRate: correct ? 1 : 0,
      durationMs: 3000,
      targetMs: 5000,
      attempts: attemptCount,
    });
    const scoreRate = correct ? 1 : 0;
    const rating = rateByScoreRate(scoreRate);

    if (tokens) {
      try {
        const res = await api.submitPractice(
          {
            courseId,
            sentenceId: current.id,
            mode,
            correct,
            durationMs: 3000,
            attempts: attemptCount,
            score,
            maxCombo: comboPeak,
            scoreRate,
            clientTimestamp: Date.now(),
          },
          tokens,
        );
        if ('coinsEarned' in res && res.coinsEarned !== undefined) {
          setSettlement({ rating: (res as { rating: string }).rating, coins: res.coinsEarned });
          setTimeout(() => setSettlement(null), 2000);
        }
        await api.saveProgress(courseId, { mode, sentenceOrder: idx + 1, completed: idx + 1 >= sentences.length }, tokens);
      } catch {
        // 离线缓存
      }
    }
    if (idx + 1 < sentences.length) {
      setIdx((i) => i + 1);
      setStep(0);
      setAttempts(0);
      setWrong(false);
    } else {
      Taro.showToast({ title: '本课程完成', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    }
  };

  const skip = () => {
    setCombo(0);
    if (tokens) {
      void api.submitPractice(
        {
          courseId,
          sentenceId: current.id,
          mode,
          correct: false,
          durationMs: 0,
          attempts,
          score: 0,
          maxCombo: 0,
          scoreRate: 0,
          clientTimestamp: Date.now(),
        },
        tokens,
      );
    }
    if (idx + 1 < sentences.length) {
      setIdx((i) => i + 1);
      setStep(0);
      setAttempts(0);
      setWrong(false);
    }
  };

  const switchMode = (m: PracticeMode) => {
    setMode(m);
    setStep(0);
    setAttempts(0);
    setWrong(false);
  };

  const nextListenStage = () => {
    if (listenStage === 0) {
      playCurrent(0.75);
      setListenStage(1);
    } else if (listenStage === 1) {
      setListenStage(2);
    }
  };

  const startRecord = async () => {
    setSpeech(null);
    setRecording(true);
    await getPlatformAdapter().recorder.start();
  };
  const stopRecord = async () => {
    await getPlatformAdapter().recorder.stop();
    setRecording(false);
    if (!tokens) return;
    const res = await api.speechScore(
      { sentenceText: current.text, durationMs: 1500 },
      tokens,
    );
    setSpeech(res);
    if (res.score >= 60) {
      finishSentence(true, 0, combo);
    }
  };

  const modeBar = (
    <View className="pill-row" style={{ marginBottom: '24rpx' }}>
      {([
        [PracticeMode.ZhToEn, '中译英'],
        [PracticeMode.Dictation, '听写'],
        [PracticeMode.Listening, '听力'],
        [PracticeMode.Speaking, '口语'],
      ] as const).map(([m, label]) => (
        <Text key={m} className={`pill ${mode === m ? 'active' : ''}`} onClick={() => switchMode(m)}>
          {label}
        </Text>
      ))}
    </View>
  );

  return (
    <View className="page-shell">
      <View className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text className="page-title">句子练习</Text>
        <Text className="badge badge-ink">第 {idx + 1}/{sentences.length} 句</Text>
      </View>

      {modeBar}

      {combo >= 2 && (
        <View style={{ display: 'flex', alignItems: 'center', gap: '14rpx', marginBottom: '20rpx' }}>
          <Text style={{ fontSize: '40rpx' }}>{combo >= 10 ? '🔥' : combo >= 5 ? '⚡' : '✨'}</Text>
          <Text style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: 'var(--brand-600)' }}>
            {combo >= 10 ? 'PERFECT!' : combo >= 5 ? 'GREAT!' : `${combo} 连击`}
          </Text>
          <Text className="muted" style={{ fontSize: 'var(--font-tiny)' }}>最高 {maxCombo}</Text>
        </View>
      )}

      {settlement && (
        <View style={{ display: 'flex', alignItems: 'center', gap: '14rpx', marginBottom: '20rpx', padding: '16rpx 24rpx', borderRadius: 'var(--radius)', background: 'var(--success-bg)' }}>
          <Text style={{ fontSize: '28rpx' }}>🎉</Text>
          <Text style={{ fontSize: 'var(--font-small)', color: 'var(--success)', fontWeight: 600 }}>{settlement.rating} 评级</Text>
          <Text style={{ fontSize: 'var(--font-small)', color: 'var(--success)' }}>+{settlement.coins} 金币</Text>
        </View>
      )}

      <View className="practice-card">
        {mode === PracticeMode.ZhToEn && (
          <>
            <Text className="sentence-translation">{current.translation}</Text>
            <View className="word-built" style={{ marginTop: '32rpx' }}><Text>{built}</Text></View>
            {wrong && <Text style={{ display: 'block', marginTop: '16rpx', color: 'var(--danger)', fontSize: 'var(--font-small)', fontWeight: 600 }}>再试一次</Text>}
            <View className="chip-row">
              {candidates.map((t) => (
                <Button key={t.id} className="word-chip" onClick={() => onPick(t.text)}>{t.text}</Button>
              ))}
            </View>
          </>
        )}

        {mode === PracticeMode.Dictation && (
          <>
            <Text className="sentence-translation" style={{ fontSize: 'var(--font-title)' }}>👂 听音频，拼出句子</Text>
            <View className="btn-row" style={{ marginTop: '32rpx' }}>
              <View className="btn btn-ghost" onClick={() => playCurrent(1)}>▶ 播放</View>
              <View className="btn btn-outline" onClick={() => playCurrent(0.75)}>🐢 慢速</View>
            </View>
            <View className="word-built" style={{ marginTop: '28rpx' }}><Text>{built}</Text></View>
            {wrong && <Text style={{ display: 'block', marginTop: '16rpx', color: 'var(--danger)', fontSize: 'var(--font-small)', fontWeight: 600 }}>再试一次</Text>}
            <View className="chip-row">
              {candidates.map((t) => (
                <Button key={t.id} className="word-chip" onClick={() => onPick(t.text)}>{t.text}</Button>
              ))}
            </View>
          </>
        )}

        {mode === PracticeMode.Listening && (
          <>
            <Text className="sentence-translation" style={{ fontSize: 'var(--font-title)' }}>
              {listenStage === 0 ? '🔇 第一遍 · 盲听' : listenStage === 1 ? '🐢 第二遍 · 慢速' : '📝 第三遍 · 看字幕'}
            </Text>
            <View className="btn-row" style={{ marginTop: '32rpx' }}>
              {listenStage === 0 && <View className="btn btn-ghost" onClick={() => playCurrent(1)}>▶ 播放</View>}
              <View className="btn btn-primary" onClick={nextListenStage}>
                {listenStage === 0 ? '进入慢听' : listenStage === 1 ? '进入字幕' : '听懂了，下一句'}
              </View>
            </View>
            {listenStage >= 2 && (
              <>
                <Text className="sentence-translation" style={{ marginTop: '32rpx' }}>{current.translation}</Text>
                <Text className="sentence-text">{current.text}</Text>
              </>
            )}
          </>
        )}

        {mode === PracticeMode.Speaking && (
          <>
            <Text className="sentence-translation">{current.text}</Text>
            <Text className="sentence-text">{current.translation}</Text>
            {speech && (
              <View style={{ marginTop: '28rpx', padding: '24rpx', borderRadius: 'var(--radius)', background: 'var(--brand-50)' }}>
                <Text style={{ display: 'block', fontSize: '40rpx', fontWeight: 700, color: 'var(--brand-600)' }}>{speech.score} 分</Text>
                <Text style={{ display: 'block', marginTop: '8rpx', fontSize: 'var(--font-small)', color: 'var(--ink-600)', lineHeight: 1.6 }}>{speech.feedback}</Text>
              </View>
            )}
            <View className="btn-row" style={{ marginTop: '32rpx' }}>
              {!recording ? (
                <View className="btn btn-primary" onClick={() => void startRecord()}>🎙️ 开始录音</View>
              ) : (
                <View className="btn btn-danger" onClick={() => void stopRecord()}>⏹ 停止并评分</View>
              )}
              <View className="btn btn-ghost" onClick={() => playCurrent(1)}>听原音</View>
            </View>
          </>
        )}
      </View>

      <View className="btn-row">
        <View className="btn btn-outline" onClick={skip}>跳过</View>
        <View className="btn btn-danger" onClick={() => api.addVocab(current.text, tokens).then(() => Taro.showToast({ title: '已加入生词本', icon: 'success' }))}>
          📒 标记生词
        </View>
      </View>

      <AiAssistantPanel
        context={{
          text: current.text,
          translation: current.translation,
          tokens: current.tokens.map((t) => ({ text: t.text, isPunctuation: t.isPunctuation })),
        }}
      />
    </View>
  );
}
