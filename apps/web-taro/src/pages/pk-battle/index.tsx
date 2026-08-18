import { useEffect, useMemo, useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
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

  // 连上 ws 并监听
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

  // 计时
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

  if (result) {
    const won = result.winnerId === null ? null : result.winnerId === myId;
    return (
      <View className="pk-result">
        <Text className="title">{won === null ? '平局' : won ? '胜利！' : '惜败'}</Text>
        <Text>你 {result.myScore} · 对手 {result.opponentScore}</Text>
        <Text>答对 {result.myCorrect} 题 · 积分 {result.pointsDelta > 0 ? `+${result.pointsDelta}` : result.pointsDelta}</Text>
        <Button onClick={() => Taro.redirectTo({ url: '/pages/pk-lobby/index' })}>返回大厅</Button>
      </View>
    );
  }

  return (
    <View className="pk-battle">
      <View className="scoreboard">
        <Text className="me">我 {myScore}</Text>
        <Text className="vs">{opp ? opp.displayName : '…'} {oppScore}</Text>
      </View>
      {remaining <= 3000 && remaining > 0 && <Text className="timeup">⏱ {Math.ceil(remaining / 1000)}s</Text>}
      {question ? (
        <>
          <Text className="translation">{question.translation}</Text>
          <View className="built"><Text>{built}</Text></View>
          <View className="candidates">
            {candidates.map((c) => (
              <Button key={c.id} size="mini" onClick={() => onPick(c.text)}>{c.text}</Button>
            ))}
          </View>
        </>
      ) : (
        <Text>{room?.status === 'ready' ? '就绪，点击开始' : '等待对手加入…'}</Text>
      )}
      {room?.status === 'ready' && (
        <Button onClick={() => ws.send('start_game', { roomId })}>开始对战</Button>
      )}
    </View>
  );
}