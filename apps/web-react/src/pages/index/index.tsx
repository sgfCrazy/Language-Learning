import { Box, Button, Card, CardActionArea, Typography, Avatar, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

const NAV = [
  { label: '导入影视 / 歌曲', icon: '＋', tint: '#f26b4d', url: '/import' },
  { label: '课程商城', icon: '🛍️', tint: '#5b6cff', url: '/catalog' },
  { label: '每日任务', icon: '🎯', tint: '#22c55e', url: '/tasks' },
  { label: '排行榜', icon: '🏆', tint: '#f59e0b', url: '/leaderboard' },
  { label: '复习本', icon: '🔁', tint: '#0ea5e9', url: '/review' },
  { label: '生词本', icon: '📒', tint: '#8b5cf6', url: '/vocab' },
  { label: '成长记录', icon: '📈', tint: '#ec4899', url: '/growth' },
  { label: '对战大厅', icon: '⚔️', tint: '#f0435a', url: '/pk-lobby' },
  { label: '刷新会话', icon: '↻', tint: '#64748b', action: 'init' },
];

export default function Index() {
  const navigate = useNavigate();
  const { userId, init, logout } = useAuthStore();

  const onTap = (item: { url?: string; action?: string }) => {
    if (item.action === 'init') {
      void init();
      return;
    }
    if (item.url) navigate(item.url);
  };

  return (
    <div className="page-shell">
      <Box
        sx={{
          borderRadius: 3,
          p: { xs: 3, md: 5 },
          mb: 3,
          background: 'linear-gradient(135deg, #5b6cff 0%, #8b5cf6 100%)',
          color: '#fff',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Language Learning
        </Typography>
        <Typography sx={{ mt: 0.5, opacity: 0.95 }}>每天 10 分钟，轻松开口说英语</Typography>
        <Typography variant="body2" sx={{ mt: 2, display: 'inline-block', bgcolor: 'rgba(255,255,255,0.15)', px: 1.5, py: 0.5, borderRadius: 999 }}>
          {userId ? `👤 ${userId.slice(0, 8)}` : '🚀 开始你的学习之旅'}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        <Card variant="outlined">
          <CardActionArea sx={{ p: 2 }} onClick={() => navigate(userId ? '/' : '/login')}>
            <Typography variant="h6">{userId ? '已登录' : '未登录'}</Typography>
            <Typography variant="body2" color="text.secondary">账号状态 · {userId ? '✓ 会话有效' : '点击登录'}</Typography>
          </CardActionArea>
        </Card>
      </Box>

      {userId ? (
        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>{userId.slice(0, 1).toUpperCase()}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>欢迎回来</Typography>
            <Typography variant="body2" color="text.secondary">继续坚持，你会看到进步</Typography>
          </Box>
          <Button color="secondary" onClick={() => void logout()}>退出登录</Button>
        </Card>
      ) : (
        <Button variant="contained" color="primary" fullWidth size="large" sx={{ mb: 3 }} onClick={() => navigate('/login')}>
          登录 / 注册
        </Button>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {NAV.map((item) => (
          <Card key={item.label} variant="outlined">
            <CardActionArea sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }} onClick={() => onTap(item)}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${item.tint}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{item.icon}</Box>
              <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </div>
  );
}