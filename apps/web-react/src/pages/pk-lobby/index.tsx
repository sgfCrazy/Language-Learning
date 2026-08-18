import { useState } from 'react';
import { Box, Button, Card, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../components/ToastProvider';

interface PkRoomRow {
  roomId: string;
  status: string;
  players: { displayName: string }[];
  questionCount: number;
}

const ACTION_ITEMS = [
  { icon: '🏠', label: '创建公开房间', desc: '任何人都可加入', mode: 'public' as const },
  { icon: '🔒', label: '创建私密房间', desc: '输入房间号加入', mode: 'private' as const },
  { icon: '⚔️', label: '随机匹配', desc: '匹配实力相当的对手', mode: 'match' as const },
];

export default function PkLobby() {
  const navigate = useNavigate();
  const toast = useToast();
  const tokens = useAuthStore((s) => s.tokens);
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const { data } = useQuery({
    queryKey: ['pk-rooms'],
    queryFn: () => api.pkListRooms(tokens),
    enabled: !!tokens,
    refetchInterval: 5000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['pk-rooms'] });

  const goBattle = (roomId: string) => navigate(`/pk-battle?roomId=${roomId}`);

  const createMut = useMutation({
    mutationFn: (mode: 'public' | 'private') => api.pkCreateRoom({ mode, questionCount: 5 }, tokens),
    onSuccess: (room) => {
      invalidate();
      goBattle((room as { roomId: string }).roomId);
    },
  });

  const joinMut = useMutation({
    mutationFn: (id: string) => api.pkJoinRoom(id, tokens),
    onSuccess: (room) => goBattle((room as { roomId: string }).roomId),
  });

  const codeMut = useMutation({
    mutationFn: (c: string) => api.pkJoinByCode(c, tokens),
    onSuccess: (room) => goBattle((room as { roomId: string }).roomId),
    onError: () => toast('加入失败', 'error'),
  });

  const matchMut = useMutation({
    mutationFn: () => api.pkStartMatch(tokens),
    onSuccess: (res) => {
      if (res.queued) {
        toast('匹配中…', 'info');
        setTimeout(() => matchMut.mutate(), 2500);
      } else if (res.room) {
        goBattle((res.room as { roomId: string }).roomId);
      }
    },
  });

  const onAction = (mode: 'public' | 'private' | 'match') => {
    if (mode === 'match') matchMut.mutate();
    else createMut.mutate(mode);
  };

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }

  const rooms = (data?.items as PkRoomRow[]) ?? [];

  return (
    <div className="page-shell">
      <Typography className="page-title">对战大厅</Typography>
      <Typography className="page-sub">邀请好友，一决高下</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2.5 }}>
        {ACTION_ITEMS.map((item) => (
          <Card key={item.mode} variant="outlined" sx={{ p: 2.5, cursor: 'pointer', textAlign: 'center', '&:hover': { borderColor: 'primary.main' } }} onClick={() => onAction(item.mode)}>
            <Typography sx={{ fontSize: 32 }}>{item.icon}</Typography>
            <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
            <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
          </Card>
        ))}
      </Box>

      <Card variant="outlined" sx={{ p: 2.5, mb: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>加入私密房间</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="输入 6 位房间号"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputProps={{ maxLength: 6 }}
          />
          <Button variant="contained" disabled={code.length !== 6} onClick={() => codeMut.mutate(code)}>加入</Button>
        </Box>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>公开房间</Typography>
        <Typography variant="body2" color="text.secondary">{rooms.length} 个等待中</Typography>
      </Box>

      {rooms.length === 0 && (
        <Box className="center-slot" sx={{ py: 5 }}>
          <Typography>🎮 暂无等待中的房间</Typography>
          <Button variant="contained" onClick={() => matchMut.mutate()} sx={{ mt: 1 }}>匹配一个对手</Button>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
        {rooms.map((r) => (
          <Card key={r.roomId} variant="outlined" sx={{ p: 2, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => joinMut.mutate(r.roomId)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 24 }}>{r.status === 'ready' ? '⚔' : '⏳'}</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{r.players.map((p) => p.displayName).join(' vs ') || '等待玩家'}</Typography>
                <Typography variant="body2" color="text.secondary">{r.questionCount} 题 · {r.status === 'ready' ? '已就绪' : '等待中'}</Typography>
              </Box>
              <Button size="small" variant="outlined">加入</Button>
            </Box>
          </Card>
        ))}
      </Box>
    </div>
  );
}