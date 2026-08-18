import { useEffect, useState } from 'react';
import { Box, Button, Card, TextField, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const navigate = useNavigate();
  const { loginEmail, registerEmail, loading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFormError('');
    clearError();
  }, [mode, clearError]);

  const submit = async () => {
    const normalizedEmail = email.trim();
    const normalizedName = displayName.trim();
    setFormError('');
    try {
      if (mode === 'login') {
        await loginEmail(normalizedEmail, password);
      } else {
        await registerEmail(normalizedEmail, password, normalizedName || `用户${Date.now() % 1000}`);
      }
      navigate('/', { replace: true });
    } catch {
      // 错误已写入 store.error
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 520, mx: 'auto', mt: { xs: 2, md: 6 } }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, mb: 1 }}>
          语
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>每天一点点，真的会进步。</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          把英语练习变成轻松、可持续的日常。听、说、拼句，一次只学一个小目标。
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h6">{mode === 'login' ? '欢迎回来' : '创建账号'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {mode === 'login' ? '登录后继续你的学习之旅' : '30 秒开启高效学习'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mode === 'register' && (
            <TextField label="昵称" placeholder="昵称" value={displayName} onChange={(e) => setDisplayName(e.target.value)} fullWidth />
          )}
          <TextField label="邮箱" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="密码" placeholder="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />

          <Button variant="contained" color="primary" size="large" disabled={loading} onClick={() => void submit()}>
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {mode === 'login' ? '还没有账号？' : '已经有账号？'}&nbsp;
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? '去注册' : '去登录'}
              </Box>
            </Typography>
          </Box>

          {(formError || error) && <Alert severity="error">{formError || error}</Alert>}
        </Box>
      </Card>
    </Box>
  );
}