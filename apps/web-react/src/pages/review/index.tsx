import { Box, Button, Card, Chip, Typography, Avatar, IconButton } from '@mui/material';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function Review() {
  const navigate = useNavigate();
  const tokens = useAuthStore((s) => s.tokens);
  const { data, isLoading } = useQuery({
    queryKey: ['today-review'],
    queryFn: () => api.getTodayReview(tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }
  if (isLoading) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔁 加载中…</Typography></Box></div>
    );
  }

  const sentences = (data?.sentences as Array<{ sentenceId: string; courseId: string; text: string; translation: string }>) ?? [];
  const vocab = (data?.vocab as Array<{ id: string; word: string; status: string }>) ?? [];

  return (
    <div className="page-shell">
      <Typography className="page-title">今日复习</Typography>
      <Typography className="page-sub">趁热打铁，巩固记忆</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{sentences.length}</Typography>
          <Typography variant="body2" color="text.secondary">待复习句子</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{vocab.length}</Typography>
          <Typography variant="body2" color="text.secondary">待复习生词</Typography>
        </Card>
        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{sentences.length + vocab.length === 0 ? '✓' : sentences.length + vocab.length}</Typography>
          <Typography variant="body2" color="text.secondary">总计</Typography>
        </Card>
      </Box>

      {sentences.length === 0 && vocab.length === 0 && (
        <Box className="center-slot"><Typography>🎉 今天没有需要复习的内容</Typography></Box>
      )}

      {sentences.length > 0 && (
        <Card variant="outlined" sx={{ p: 2, mb: 2, maxWidth: 640, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1, pb: 0.5 }}>
            <Typography sx={{ fontWeight: 800 }}>待复习句子</Typography>
            <Typography variant="body2" color="text.secondary">{sentences.length} 句</Typography>
          </Box>
          {sentences.map((s) => (
            <Box key={s.sentenceId} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => navigate(`/practice?courseId=${s.courseId}`)}>
              <Avatar sx={{ bgcolor: '#eef1ff', color: 'primary.main' }}>✏️</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{s.translation}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{s.text}</Typography>
              </Box>
              <IconButton size="small"><ArrowForwardIosIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></IconButton>
            </Box>
          ))}
        </Card>
      )}

      {vocab.length > 0 && (
        <Card variant="outlined" sx={{ p: 2, maxWidth: 640, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1, pb: 0.5 }}>
            <Typography sx={{ fontWeight: 800 }}>待复习生词</Typography>
            <Typography variant="body2" color="text.secondary">{vocab.length} 个</Typography>
          </Box>
          {vocab.map((v) => (
            <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
              <Avatar sx={{ bgcolor: '#eef1ff', color: 'primary.main' }}>📒</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{v.word}</Typography>
                <Typography variant="caption" color="text.secondary">{v.status}</Typography>
              </Box>
              <Button size="small" color="success" variant="outlined" onClick={() => api.markVocabMastered(v.id, tokens)}>✓ 掌握</Button>
            </Box>
          ))}
        </Card>
      )}
    </div>
  );
}