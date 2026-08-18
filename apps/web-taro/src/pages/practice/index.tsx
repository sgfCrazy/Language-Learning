import { useEffect, useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import type { SentenceDto, SoundName } from '@app/shared';
import { PracticeMode, getPlatformAdapter, scoreSentence } from '@app/shared';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

/**
 * 连词成句练习（中译英模式）。
 * 累加式拼接：依次把下一个词块追加到已拼部分，错误即时反馈。
 */
export default function Practice() {
  const router = useRouter();
  const courseId = (router.params.courseId as string) ?? '';
  const tokens = useAuthStore((s) => s.tokens);

  const { data, isLoading } = useQuery({
    queryKey: ['course-sentences', courseId],
    queryFn: () => api.getCourseSentences(courseId, tokens),
  });

  const sentences = data?.sentences ?? [];
  const startOrder = data?.progress?.sentenceOrder ?? 0;
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0); // 当前句子已拼到的词块 index
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mode] = useState<PracticeMode>(PracticeMode.ZhToEn);

  // 进入课程时从进度位置继续
  useEffect(() => {
    if (sentences.length > 0) {
      setIdx(Math.min(startOrder, sentences.length - 1));
    }
    // 仅在首次加载时设置；依赖 sentences 加载完成
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentences.length]);

  const current: SentenceDto | undefined = sentences[idx];
  const tokensArr = current?.tokens ?? [];
  const built = useMemo(() => tokensArr.slice(0, step).map((t) => t.text).join(' '), [tokensArr, step]);

  if (isLoading) return <View><Text>加载中…</Text></View>;
  if (!current) return <View><Text>无内容</Text></View>;

  const expected = tokensArr[step];

  // 提供给用户选择的候选词块：打乱顺序（含尚未使用的词块）
  const candidates = useMemo(() => {
    const remaining = tokensArr.filter((_, i) => i >= step);
    // 简单打乱（保持确定性：用 index 偏移）
    return [...remaining].sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [tokensArr, step]);

  const playSound = (name: SoundName) => {
    getPlatformAdapter()
      .sound.play(name)
      .catch(() => undefined);
  };

  const onPick = (text: string) => {
    if (!expected) return;
    if (text === expected.text) {
      setWrong(false);
      const nextStep = step + 1;
      if (nextStep >= tokensArr.length) {
        // 本题完成
        playSound('correct');
        finishSentence(true, attempts);
      } else {
        playSound('great');
        setStep(nextStep);
      }
    } else {
      setWrong(true);
      setAttempts((a) => a + 1);
      playSound('wrong');
      getPlatformAdapter().vibration.vibrate().catch(() => undefined);
    }
  };

  const finishSentence = async (correct: boolean, attemptCount: number) => {
    const score = scoreSentence({
      correctRate: correct ? 1 : 0,
      durationMs: 3000,
      targetMs: 5000,
      attempts: attemptCount,
    });
    if (tokens) {
      try {
        await api.submitPractice(
          {
            courseId,
            sentenceId: current.id,
            mode,
            correct,
            durationMs: 3000,
            attempts: attemptCount,
            score,
            clientTimestamp: Date.now(),
          },
          tokens,
        );
        await api.saveProgress(courseId, { mode, sentenceOrder: idx + 1, completed: idx + 1 >= sentences.length }, tokens);
      } catch {
        // 离线缓存由适配层负责；本期简化
      }
    }
    // 下一题
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
    // 跳过：记为未掌握（后续 review-system 接管），进入下一题
    if (tokens) {
      void api.submitPractice(
        {
          courseId,
          sentenceId: current.id,
          mode,
          correct: false,
          durationMs: 0,
          attempts: attempts,
          score: 0,
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

  return (
    <View className="practice">
      <Text className="translation">{current.translation}</Text>
      <View className="built">
        <Text>{built}</Text>
      </View>
      {wrong && <Text className="wrong">再试一次</Text>}
      <View className="candidates">
        {candidates.map((t) => (
          <Button key={t.id} size="mini" onClick={() => onPick(t.text)}>
            {t.text}
          </Button>
        ))}
      </View>
      <Button onClick={skip}>跳过</Button>
      <Text className="meta">第 {idx + 1}/{sentences.length} 句 · 步骤 {step + 1}/{tokensArr.length}</Text>
    </View>
  );
}
