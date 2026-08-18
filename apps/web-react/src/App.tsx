import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/auth';

export default function AppLayout() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ backdropFilter: 'blur(10px)', bgcolor: 'rgba(255,255,255,0.85)', borderBottom: '1px solid #eef1f7' }}>
        <Toolbar sx={{ maxWidth: 1200, width: '100%', alignSelf: 'center' }}>
          <IconButton edge="start" sx={{ mr: 1 }} onClick={() => navigate('/')} aria-label="首页">
            <MenuBookIcon sx={{ color: (t) => t.palette.primary.main }} />
          </IconButton>
          <Typography variant="h6" sx={{ cursor: 'pointer', fontWeight: 800 }} onClick={() => navigate('/')}>
            Language Learning
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', cursor: 'pointer' }}
            onClick={() => navigate(userId ? '/' : '/login')}
          >
            {userId ? '👤 已登录' : '登录 / 注册'}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}