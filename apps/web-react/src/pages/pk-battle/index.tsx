import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const roomId = params.get('roomId') ?? '';
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
      if (next >= chips.length) void finish(true);
    } else {
      void finish(false);
    }
  };

  const myCorrect = Object.values(progress).filter((p) => p.userId === myId && p.correct).length;

  if (result) {
    const won = result.winnerId === null ? null : result.winnerId === myId;
    return (
      <div className="page-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '70vh' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}><Typography sx={{ fontSize: 60 }}>{won === null ? '🤝' : won ? '🏆' : '💪'}</Typography></Box>
        <Card sx={{ p: 4, textAlign: 'center', color: '#fff', background: 'linear-gradient(135deg, #5b6cff, #8b5cf6)', border: 'none' }}>
          <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{won === null ? '平局！' : won ? '胜利！' : '惜败'}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 2.5 }}>
            <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{result.myScore}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>我的得分</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800 }}>{result.opponentScore}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>对手得分</Typography>
            </Box>
          </Box>
          <Chip label={`答对 ${result.myCorrect} 题 · 积分 ${result.pointsDelta > 0 ? `+${result.pointsDelta}` : result.pointsDelta}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', mt: 2.5 }} />
        </Card>
        <Button variant="contained" color="primary" fullWidth size="large" sx={{ mt: 3 }} onClick={() => navigate('/pk-lobby', { replace: true })}>
          返回大厅
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', flex: 1, maxWidth: 220 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{myScore}</Typography>
          <Typography variant="body2" color="text.secondary">我 · 答对 {myCorrect} 题</Typography>
        </Box>
        <Chip label="VS" color="secondary" size="small" sx={{ fontWeight: 800 }} />
        <Box sx={{ textAlign: 'center', flex: 1, maxWidth: 220 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>{oppScore}</Typography>
          <Typography variant="body2" color="text.secondary">{opp ? opp.displayName : '…'}</Typography>
        </Box>
      </Box>

      {remaining <= 3000 && remaining > 0 && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip label={`⏱ 还剩 ${Math.ceil(remaining / 1000)}s`} color="error" variant="outlined" sx={{ fontWeight: 700 }} />
        </Box>
      )}

      {question ? (
        <Card variant="outlined" sx={{ p: 4, mb: 2, maxWidth: 560, mx: 'auto' }}>
          <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{question.translation}</Typography>
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 600, minHeight: 32 }}>{built}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
            {candidates.map((c) => (
              <Chip key={c.id} label={c.text} onClick={() => onPick(c.text)} variant="outlined" sx={{ fontSize: '0.95rem', py: 2, '&:hover': { bgcolor: 'primary.50' } }} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            第 {question.questionIndex + 1} 题 · 点击词块拼出正确句子
          </Typography>
        </Card>
      ) : (
        <Box className="center-slot" sx={{ py: 8 }}>
          <Typography sx={{ fontSize: 40 }}>{room?.status === 'ready' ? '⚔️' : '⏳'}</Typography>
          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{room?.status === 'ready' ? '就绪，点击开始对战' : '等待对手加入…'}</Typography>
          <Typography variant="body2" color="text.secondary">房间号 {roomId.slice(0, 8)}</Typography>
        </Box>
      )}

      {room?.status === 'ready' && (
        <Button variant="contained" fullWidth size="large" onClick={() => ws.send('start_game', { roomId })}>开始对战</Button>
      )}
    </div>
  );
}