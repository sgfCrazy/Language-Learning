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

  // 连击系统
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // 听力三阶段：0 盲听 → 1 慢听 → 2 字幕
  const [listenStage, setListenStage] = useState(0);
  // 口语录音
  const [recording, setRecording] = useState(false);
  const [speech, setSpeech] = useState<{ score: number; feedback: string } | null>(null);

  // 结算反馈
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

  // 切句/切模式时清理播放器与阶段状态
  useEffect(() => {
    const media = getPlatformAdapter().media;
    media.pause().catch(() => undefined);
    setListenStage(0);
    setSpeech(null);
  }, [idx, mode]);

  if (isLoading) return <View><Text>加载中…</Text></View>;
  if (!current) return <View><Text>无内容</Text></View>;

  const expected = tokensArr[step];

  const playSound = (name: SoundName) => {
    getPlatformAdapter().sound.play(name).catch(() => undefined);
  };

  /** 播放当前句媒体（slice 到 endMs 自动暂停） */
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
      // 播到句末自动暂停
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

  /** 听力模式推进阶段 */
  const nextListenStage = () => {
    if (listenStage === 0) {
      playCurrent(0.75); // 慢听
      setListenStage(1);
    } else if (listenStage === 1) {
      setListenStage(2); // 看字幕
    }
  };

  /** 口语录音并评分 */
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
    <View className="mode-bar">
      <Button size="mini" className={mode === PracticeMode.ZhToEn ? 'active' : ''} onClick={() => switchMode(PracticeMode.ZhToEn)}>中译英</Button>
      <Button size="mini" className={mode === PracticeMode.Dictation ? 'active' : ''} onClick={() => switchMode(PracticeMode.Dictation)}>听写</Button>
      <Button size="mini" className={mode === PracticeMode.Listening ? 'active' : ''} onClick={() => switchMode(PracticeMode.Listening)}>听力</Button>
      <Button size="mini" className={mode === PracticeMode.Speaking ? 'active' : ''} onClick={() => switchMode(PracticeMode.Speaking)}>口语</Button>
    </View>
  );

  return (
    <View className="practice">
      {modeBar}
      {/* 连击计数器 */}
      {combo >= 2 && (
        <View className="combo">
          <Text className="combo-num">{combo}</Text>
          <Text className="combo-label">{combo >= 10 ? 'PERFECT!' : combo >= 5 ? 'GREAT!' : '连击'}</Text>
        </View>
      )}
      {/* 结算反馈 */}
      {settlement && (
        <View className="settlement">
          <Text className="rating">{settlement.rating} 评级</Text>
          <Text className="coins">+{settlement.coins} 金币</Text>
        </View>
      )}

      {mode === PracticeMode.ZhToEn && (
        <>
          <Text className="translation">{current.translation}</Text>
          <View className="built"><Text>{built}</Text></View>
          {wrong && <Text className="wrong">再试一次</Text>}
          <View className="candidates">
            {candidates.map((t) => (
              <Button key={t.id} size="mini" onClick={() => onPick(t.text)}>{t.text}</Button>
            ))}
          </View>
        </>
      )}

      {mode === PracticeMode.Dictation && (
        <>
          <Text className="hint">听音频，拼出句子</Text>
          <View className="media-ctl">
            <Button size="mini" onClick={() => playCurrent(1)}>播放</Button>
            <Button size="mini" onClick={() => playCurrent(0.75)}>慢速</Button>
          </View>
          <View className="built"><Text>{built}</Text></View>
          {wrong && <Text className="wrong">再试一次</Text>}
          <View className="candidates">
            {candidates.map((t) => (
              <Button key={t.id} size="mini" onClick={() => onPick(t.text)}>{t.text}</Button>
            ))}
          </View>
        </>
      )}

      {mode === PracticeMode.Listening && (
        <>
          <Text className="hint">
            {listenStage === 0 ? '第一遍 · 盲听' : listenStage === 1 ? '第二遍 · 慢速' : '第三遍 · 看字幕'}
          </Text>
          <View className="media-ctl">
            {listenStage === 0 && <Button size="mini" onClick={() => playCurrent(1)}>播放</Button>}
            <Button size="mini" onClick={nextListenStage}>进入{listenStage === 0 ? '慢听' : listenStage === 1 ? '字幕' : '练习'}阶段</Button>
          </View>
          {listenStage >= 2 && (
            <>
              <Text className="translation">{current.translation}</Text>
              <Text className="subtitle">{current.text}</Text>
            </>
          )}
          {listenStage >= 2 && (
            <Button onClick={() => finishSentence(true, 0, combo)}>听懂了，下一句</Button>
          )}
        </>
      )}

      {mode === PracticeMode.Speaking && (
        <>
          <Text className="translation">{current.text}</Text>
          <Text className="subtitle">{current.translation}</Text>
          {speech && (
            <View className="speech-result">
              <Text className="rating">{speech.score} 分</Text>
              <Text>{speech.feedback}</Text>
            </View>
          )}
          <View className="media-ctl">
            {!recording ? (
              <Button onClick={startRecord}>开始录音</Button>
            ) : (
              <Button onClick={stopRecord}>停止并评分</Button>
            )}
            <Button size="mini" onClick={() => playCurrent(1)}>听原音</Button>
          </View>
        </>
      )}

      <Button onClick={skip}>跳过</Button>
      <Button onClick={() => api.addVocab(current.text, tokens).then(() => Taro.showToast({ title: '已加入生词本', icon: 'success' }))}>
        标记生词
      </Button>
      <Text className="meta">
        第 {idx + 1}/{sentences.length} 句 · 步骤 {step + 1}/{tokensArr.length} · 最高连击 {maxCombo}
      </Text>
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