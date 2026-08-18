import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Typography, Avatar, Paper, LinearProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { SentenceDto, SoundName } from '@app/shared';
import { PracticeMode, getPlatformAdapter, scoreSentence, rateByScoreRate } from '@app/shared';
import { api, resolveMediaUrl } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../components/ToastProvider';
import AiAssistantPanel from '../../components/AiAssistantPanel';

/**
 * 练习页：支持 中译英 / 听写 / 听力 / 口语测评 四种模式。
 * 媒体播放一律走 PlatformAdapter.media。
 */
export default function Practice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const courseId = params.get('courseId') ?? '';
  const courseType = params.get('type') ?? 'text';
  const tokens = useAuthStore((s) => s.tokens);

  const { data, isLoading } = useQuery({
    queryKey: ['course-sentences', courseId],
    queryFn: () => api.getCourseSentences(courseId, tokens),
    enabled: !!courseId,
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
      <div className="page-shell"><Box className="center-slot"><Typography>✏️ 加载中…</Typography></Box></div>
    );
  }
  if (!current) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>📭 无内容</Typography></Box></div>
    );
  }

  const expected = tokensArr[step];

  const playSound = (name: SoundName) => {
    getPlatformAdapter().sound.play(name).catch(() => undefined);
  };

  const playCurrent = (rate = 1, startMs?: number) => {
    const url = resolveMediaUrl(current.mediaUrl);
    if (!url) {
      toast('该课程无音频', 'error');
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
        void finishSentence(true, attempts, newCombo);
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
      toast('本课程完成', 'success');
      setTimeout(() => navigate('/'), 800);
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
      void finishSentence(true, 0, combo);
    }
  };

  const MODES: Array<[PracticeMode, string]> = [
    [PracticeMode.ZhToEn, '中译英'],
    [PracticeMode.Dictation, '听写'],
    [PracticeMode.Listening, '听力'],
    [PracticeMode.Speaking, '口语'],
  ];

  return (
    <div className="page-shell">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography className="page-title">句子练习</Typography>
        <Chip label={`第 ${idx + 1}/${sentences.length} 句`} size="small" variant="outlined" />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
        {MODES.map(([m, label]) => (
          <Chip key={m} label={label} color={mode === m ? 'primary' : 'default'} variant={mode === m ? 'filled' : 'outlined'} onClick={() => switchMode(m)} sx={{ fontWeight: 600 }} />
        ))}
      </Box>

      {combo >= 2 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography sx={{ fontSize: 28 }}>{combo >= 10 ? '🔥' : combo >= 5 ? '⚡' : '✨'}</Typography>
          <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
            {combo >= 10 ? 'PERFECT!' : combo >= 5 ? 'GREAT!' : `${combo} 连击`}
          </Typography>
          <Typography variant="caption" color="text.secondary">最高 {maxCombo}</Typography>
        </Box>
      )}

      {settlement && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#e8f7ef' }}>
          <Typography>🎉</Typography>
          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>{settlement.rating} 评级</Typography>
          <Typography variant="body2" sx={{ color: 'success.main' }}>+{settlement.coins} 金币</Typography>
        </Box>
      )}

      <Card variant="outlined" sx={{ p: { xs: 3, md: 4 }, mb: 2, maxWidth: 560, mx: { md: 'auto' } }}>
        {mode === PracticeMode.ZhToEn && (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{current.translation}</Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="body1" sx={{ fontSize: '1.15rem', fontWeight: 600, minHeight: 32 }}>{built}</Typography>
            </Box>
            {wrong && <Typography sx={{ mt: 1.5, color: 'error.main', fontWeight: 600, fontSize: '0.9rem' }}>再试一次</Typography>}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
              {candidates.map((t) => (
                <Chip key={t.id} label={t.text} onClick={() => onPick(t.text)} variant="outlined" sx={{ fontSize: '0.95rem', py: 2, '&:hover': { bgcolor: 'primary.50' } }} />
              ))}
            </Box>
          </>
        )}

        {mode === PracticeMode.Dictation && (
          <>
            <Typography sx={{ fontWeight: 600 }}>👂 听音频，拼出句子</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
              <Button variant="outlined" onClick={() => playCurrent(1)}>▶ 播放</Button>
              <Button variant="outlined" color="secondary" onClick={() => playCurrent(0.75)}>🐢 慢速</Button>
            </Box>
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="body1" sx={{ fontSize: '1.15rem', fontWeight: 600, minHeight: 32 }}>{built}</Typography>
            </Box>
            {wrong && <Typography sx={{ mt: 1.5, color: 'error.main', fontWeight: 600, fontSize: '0.9rem' }}>再试一次</Typography>}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
              {candidates.map((t) => (
                <Chip key={t.id} label={t.text} onClick={() => onPick(t.text)} variant="outlined" sx={{ fontSize: '0.95rem', py: 2, '&:hover': { bgcolor: 'primary.50' } }} />
              ))}
            </Box>
          </>
        )}

        {mode === PracticeMode.Listening && (
          <>
            <Typography sx={{ fontWeight: 600 }}>
              {listenStage === 0 ? '🔇 第一遍 · 盲听' : listenStage === 1 ? '🐢 第二遍 · 慢速' : '📝 第三遍 · 看字幕'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
              {listenStage === 0 && <Button variant="outlined" onClick={() => playCurrent(1)}>▶ 播放</Button>}
              <Button variant="contained" onClick={nextListenStage}>
                {listenStage === 0 ? '进入慢听' : listenStage === 1 ? '进入字幕' : '听懂了，下一句'}
              </Button>
            </Box>
            {listenStage >= 2 && (
              <>
                <Typography sx={{ mt: 3, fontWeight: 600 }}>{current.translation}</Typography>
                <Typography sx={{ mt: 1 }}>{current.text}</Typography>
              </>
            )}
          </>
        )}

        {mode === PracticeMode.Speaking && (
          <>
            <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{current.text}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{current.translation}</Typography>
            {speech && (
              <Paper variant="outlined" sx={{ mt: 2.5, p: 2, bgcolor: '#eef1ff' }}>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'primary.main' }}>{speech.score} 分</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>{speech.feedback}</Typography>
              </Paper>
            )}
            <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
              {!recording ? (
                <Button variant="contained" onClick={() => void startRecord()}>🎙️ 开始录音</Button>
              ) : (
                <Button variant="contained" color="error" onClick={() => void stopRecord()}>⏹ 停止并评分</Button>
              )}
              <Button variant="outlined" onClick={() => playCurrent(1)}>听原音</Button>
            </Box>
          </>
        )}
      </Card>

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={skip}>跳过</Button>
        <Button variant="outlined" color="error" onClick={() => api.addVocab(current.text, tokens).then(() => toast('已加入生词本', 'success'))}>
          📒 标记生词
        </Button>
      </Box>

      <AiAssistantPanel
        context={{
          text: current.text,
          translation: current.translation,
          tokens: current.tokens.map((t) => ({ text: t.text, isPunctuation: t.isPunctuation })),
        }}
      />
    </div>
  );
}