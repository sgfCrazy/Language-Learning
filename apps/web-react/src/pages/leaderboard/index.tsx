import { useState } from 'react';
import { Box, Card, Chip, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const tokens = useAuthStore((s) => s.tokens);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.getLeaderboard(period, tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }

  const rows = (data?.items as Array<{ rank: number; displayName: string; score: number }>) ?? [];
  const podium = rows.slice(0, 3);

  return (
    <div className="page-shell">
      <Typography className="page-title">积分排行榜</Typography>
      <Typography className="page-sub">与全球学习者一较高下</Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {(['week', 'month', 'all'] as const).map((p) => (
          <Chip
            key={p}
            label={p === 'week' ? '周榜' : p === 'month' ? '月榜' : '总榜'}
            color={period === p ? 'primary' : 'default'}
            variant={period === p ? 'filled' : 'outlined'}
            onClick={() => setPeriod(p)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      <Card variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>我的排名</Typography>
          <Typography variant="body2" color="text.secondary">积分 {data?.myScore ?? 0}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>{data?.myRank ? `#${data.myRank}` : '—'}</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>我的位置</Typography>
            <Typography variant="body2" color="text.secondary">{data?.myRank ? `全站第 ${data.myRank} 名` : '尚未上榜'}</Typography>
          </Box>
        </Box>
      </Card>

      {podium.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, mb: 2.5 }}>
          {podium.map((p) => {
            const heights = [180, 240, 130];
            return (
              <Box key={p.rank} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 30 }}>{MEDAL[p.rank - 1] ?? '🏅'}</Typography>
                <Avatar sx={{ bgcolor: '#eef1ff', color: 'primary.main', fontWeight: 700 }}>{p.displayName.slice(0, 1)}</Avatar>
                <Box
                  sx={{
                    width: '100%',
                    borderRadius: '16px 16px 0 0',
                    height: heights[p.rank - 1] ?? 100,
                    background:
                      p.rank === 1 ? 'linear-gradient(180deg,#ffe9b8,#f5a623)'
                        : p.rank === 2 ? 'linear-gradient(180deg,#eef1f6,#c4ccd8)'
                          : 'linear-gradient(180deg,#ffdfc9,#e0784e)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    pt: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{p.score}</Typography>
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{p.displayName}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {isLoading && (
        <Box className="center-slot"><Typography>🏆 加载中…</Typography></Box>
      )}

      {!isLoading && rows.length === 0 && (
        <Box className="center-slot"><Typography>🏆 暂无排名数据</Typography></Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
        {rows.slice(3).map((entry) => (
          <Card key={entry.rank} variant="outlined" sx={{ py: 0.5 }}>
            <ListItem>
              <ListItemAvatar><Avatar sx={{ bgcolor: '#eef1ff', color: 'primary.main', fontWeight: 700 }}>{entry.displayName.slice(0, 1)}</Avatar></ListItemAvatar>
              <ListItemText
                primary={`#${entry.rank}`}
                secondary={entry.displayName}
                primaryTypographyProps={{ sx: { fontWeight: 700, fontSize: '0.95rem' } }}
              />
              <Typography sx={{ fontWeight: 800, color: 'warning.main' }}>{entry.score}</Typography>
            </ListItem>
          </Card>
        ))}
      </Box>
    </div>
  );
}