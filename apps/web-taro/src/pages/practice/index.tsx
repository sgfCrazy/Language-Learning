import { useEffect, useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import type { SentenceDto, SoundName } from '@app/shared';
import { PracticeMode, getPlatformAdapter, scoreSentence, rateByScoreRate } from '@app/shared';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

/**
 * 连词成句练习（中译英模式）。
 * 累加式拼接：依次把下一个词块追加到已拼部分，错误即时反馈。
 * 连击系统：连续答对累加，答错归零，结算时上报峰值。
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
  const [step, setStep] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [mode] = useState<PracticeMode>(PracticeMode.ZhToEn);

  // 连击系统
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

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

  if (isLoading) return <View><Text>加载中…</Text></View>;
  if (!current) return <View><Text>无内容</Text></View>;

  const expected = tokensArr[step];

  const candidates = useMemo(() => {
    const remaining = tokensArr.filter((_, i) => i >= step);
    return [...remaining].sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [tokensArr, step]);

  const playSound = (name: SoundName) => {
    getPlatformAdapter().sound.play(name).catch(() => undefined);
  };

  const onPick = (text: string) => {
    if (!expected) return;
    if (text === expected.text) {
      setWrong(false);
      const nextStep = step + 1;
      // 连击 +1
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
      setCombo(0); // 答错归零
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
    // 下一题
    if (idx + 1 < sentences.length) {
      setIdx((i) => i + 1);
      setStep(0);
      setAttempts(0);
      setWrong(false);
      // 连击跨题保留（不重置）
    } else {
      Taro.showToast({ title: '本课程完成', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 800);
    }
  };

  const skip = () => {
    setCombo(0); // 跳过归零连击
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

  return (
    <View className="practice">
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
      <Button onClick={() => api.addVocab(current.text, tokens).then(() => Taro.showToast({ title: '已加入生词本', icon: 'success' }))}>
        标记生词
      </Button>
      <Text className="meta">
        第 {idx + 1}/{sentences.length} 句 · 步骤 {step + 1}/{tokensArr.length} · 最高连击 {maxCombo}
      </Text>
    </View>
  );
}
