import { Box, Card, Chip, LinearProgress, Typography, Avatar } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const TASK_LABELS: Record<string, string> = {
  practice_count: '练习题目',
  combo_streak: '达成连击',
  study_duration: '学习时长(分钟)',
};

export default function Tasks() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data, isLoading } = useQuery({
    queryKey: ['daily-tasks'],
    queryFn: () => api.getDailyTasks(tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }
  if (isLoading) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🎯 加载中…</Typography></Box></div>
    );
  }

  const tasks = (data?.items as Array<{ id: string; type: string; target: number; reward: number; completed: boolean; progress: number }>) ?? [];
  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="page-shell">
      <Typography className="page-title">每日任务</Typography>
      <Typography className="page-sub">完成今日任务，领取金币奖励</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{done}/{tasks.length}</Typography>
          <Typography variant="body2" color="text.secondary">已完成</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>+{tasks.reduce((s, t) => s + (t.completed ? t.reward : 0), 0)}</Typography>
          <Typography variant="body2" color="text.secondary">今日金币</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{tasks.length - done === 0 ? '✓' : tasks.length - done}</Typography>
          <Typography variant="body2" color="text.secondary">剩余任务</Typography>
        </Card>
      </Box>

      {tasks.length === 0 && (
        <Box className="center-slot"><Typography>🎯 暂无任务</Typography></Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        {tasks.map((t) => {
          const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
          return (
            <Card key={t.id} variant="outlined" sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: t.completed ? 'success.main' : 'primary.main', width: 32, height: 32, fontSize: 16 }}>
                  {t.completed ? '✓' : '·'}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{TASK_LABELS[t.type] ?? t.type}</Typography>
                    <Chip size="small" color={t.completed ? 'success' : 'warning'} label={t.completed ? '已完成' : '进行中'} />
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 999 }} />
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: t.completed ? 'success.main' : 'text.primary' }}>{t.progress}/{t.target}</Typography>
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>🪙 +{t.reward}</Typography>
                </Box>
              </Box>
            </Card>
          );
        })}
      </Box>
    </div>
  );
}