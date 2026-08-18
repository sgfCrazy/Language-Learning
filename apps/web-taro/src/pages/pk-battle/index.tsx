import { useEffect, useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getPlatformAdapter } from '@app/shared';
import { API_BASE } from '../../api/client';
import { useAuthStore } from '../../store/auth';

interface TokenChip {
  id: string;
  text: string;
}
interface PkQuestionPayload {
  questionIndex: number;
  translation: string;
  tokens: TokenChip[];
  timeLimitMs: number;
}
interface PkProgressPayload {
  userId: string;
  questionIndex: number;
  correct: boolean;
  score: number;
  points: number;
}
interface PkResultPayload {
  roomId: string;
  winnerId: string | null;
  myScore: number;
  opponentScore: number;
  myCorrect: number;
  opponentCorrect: number;
  pointsDelta: number;
}
interface RoomState {
  roomId: string;
  status: string;
  players: { userId: string; displayName: string; score: number }[];
}

export default function PkBattle() {
  const router = useRouter();
  const roomId = (router.params.roomId as string) ?? '';
  const user = useAuthStore((s) => s);

  const [question, setQuestion] = useState<PkQuestionPayload | null>(null);
  const [progress, setProgress] = useState<Record<string, PkProgressPayload>>({});
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [result, setResult] = useState<PkResultPayload | null>(null);
  const [remaining, setRemaining] = useState<number>(15000);
  const [step, setStep] = useState(0);
  const [room, setRoom] = useState<RoomState | null>(null);

  const myId = user.userId ?? '';
  const opp = room?.players.find((p) => p.userId !== myId);

  useEffect(() => {
    if (!roomId || !myId) return undefined;
    const ws = getPlatformAdapter().realtime;
    const url = `${API_BASE.replace(/^http/, 'ws').replace(/\/api\/v1$/, '/ws/pk')}?userId=${myId}`;
    void ws.connect(url);
    ws.send('join_room', { roomId });

    const offRoom = ws.on('room_state', (d) => setRoom(d as unknown as RoomState));
    const offQ = ws.on('question', (d) => {
      const q = d as unknown as PkQuestionPayload;
      setQuestion(q);
      setStep(0);
      setRemaining(q.timeLimitMs);
    });
    const offP = ws.on('progress', (d) => {
      const p = d as unknown as PkProgressPayload;
      if (p.userId === myId) setMyScore(p.score);
      else setOppScore(p.score);
      setProgress((prev) => ({ ...prev, [String(p.questionIndex)]: p }));
    });
    const offR = ws.on('result', (d) => setResult(d as unknown as PkResultPayload));

    return () => {
      offRoom();
      offQ();
      offP();
      offR();
      ws.close();
    };
  }, [roomId, myId]);

  useEffect(() => {
    if (!question || result) return undefined;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 0) return 0;
        return r - 250;
      });
    }, 250);
    return () => clearInterval(t);
  }, [question, result]);

  const chips = question?.tokens ?? [];
  const built = useMemo(() => chips.slice(0, step).map((c) => c.text).join(' '), [chips, step]);
  const expected = chips[step];
  const candidates = useMemo(() => {
    const rest = chips.filter((_, i) => i >= step);
    const shuffled = [...rest].sort((a, b) => (a.id > b.id ? 1 : -1));
    return shuffled;
  }, [chips, step]);

  const ws = getPlatformAdapter().realtime;
  const finish = async (correct: boolean) => {
    ws.send('answer', { roomId, questionIndex: question?.questionIndex, correct });
    if (step >= chips.length - 1 || !correct) {
      ws.send('next_question', { roomId });
    }
  };

  const onPick = (text: string) => {
    if (!expected) return;
    if (text === expected.text) {
      const next = step + 1;
      setStep(next);
      if (next >= chips.length) finish(true);
    } else {
      finish(false);
    }
  };

  const myCorrect = Object.values(progress).filter((p) => p.userId === myId && p.correct).length;

  if (result) {
    const won = result.winnerId === null ? null : result.winnerId === myId;
    return (
      <View className="page-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
        <View style={{ textAlign: 'center', marginBottom: '40rpx' }}>
          <Text style={{ fontSize: '96rpx' }}>{won === null ? '🤝' : won ? '🏆' : '💪'}</Text>
        </View>
        <View className="card" style={{ background: 'var(--grad-brand)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-brand)', textAlign: 'center' }}>
          <Text style={{ display: 'block', fontSize: '56rpx', fontWeight: 700 }}>{won === null ? '平局！' : won ? '胜利！' : '惜败'}</Text>
          <View style={{ display: 'flex', justifyContent: 'center', gap: '48rpx', marginTop: '32rpx' }}>
            <View>
              <Text style={{ display: 'block', fontSize: '44rpx', fontWeight: 700 }}>{result.myScore}</Text>
              <Text style={{ display: 'block', marginTop: '8rpx', fontSize: 'var(--font-tiny)', opacity: 0.85 }}>我的得分</Text>
            </View>
            <View>
              <Text style={{ display: 'block', fontSize: '44rpx', fontWeight: 700 }}>{result.opponentScore}</Text>
              <Text style={{ display: 'block', marginTop: '8rpx', fontSize: 'var(--font-tiny)', opacity: 0.85 }}>对手得分</Text>
            </View>
          </View>
          <View className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', marginTop: '32rpx' }}>
            答对 {result.myCorrect} 题 · 积分 {result.pointsDelta > 0 ? `+${result.pointsDelta}` : result.pointsDelta}
          </View>
        </View>
        <View className="btn btn-white btn-block" style={{ marginTop: '40rpx' }} onClick={() => Taro.redirectTo({ url: '/pages/pk-lobby/index' })}>
          返回大厅
        </View>
      </View>
    );
  }

  return (
    <View className="page-shell">
      <View className="pk-vs" style={{ marginBottom: '28rpx' }}>
        <View className="pk-player">
          <Text className="score">{myScore}</Text>
          <Text className="name">我 · 答对 {myCorrect} 题</Text>
        </View>
        <View className="pk-vs-badge">VS</View>
        <View className="pk-player">
          <Text className="score">{oppScore}</Text>
          <Text className="name">{opp ? opp.displayName : '…'}</Text>
        </View>
      </View>

      {remaining <= 3000 && remaining > 0 && (
        <View className="pk-timer">⏱ 还剩 {Math.ceil(remaining / 1000)}s</View>
      )}

      {question ? (
        <View className="practice-card">
          <Text className="sentence-translation" style={{ fontSize: 'var(--font-title)' }}>{question.translation}</Text>
          <View className="word-built" style={{ marginTop: '32rpx' }}><Text>{built}</Text></View>
          <View className="chip-row">
            {candidates.map((c) => (
              <View key={c.id} className="word-chip" onClick={() => onPick(c.text)}>{c.text}</View>
            ))}
          </View>
          <Text className="muted" style={{ display: 'block', marginTop: '24rpx', fontSize: 'var(--font-tiny)' }}>
            第 {question.questionIndex + 1} 题 · 点击词块拼出正确句子
          </Text>
        </View>
      ) : (
        <View className="center-slot" style={{ padding: '120rpx 0' }}>
          <View className="empty-icon">{room?.status === 'ready' ? '⚔️' : '⏳'}</View>
          <Text className="loading-text" style={{ color: 'var(--ink-900)', fontSize: 'var(--font-body)', fontWeight: 600 }}>
            {room?.status === 'ready' ? '就绪，点击开始对战' : '等待对手加入…'}
          </Text>
          <Text className="muted" style={{ fontSize: 'var(--font-small)' }}>房间号 {roomId.slice(0, 8)}</Text>
        </View>
      )}

      {room?.status === 'ready' && (
        <View className="btn btn-primary btn-block" onClick={() => ws.send('start_game', { roomId })}>开始对战</View>
      )}
    </View>
  );
}
