import { Box, Card, CardActionArea, Chip, Typography, Avatar, Button } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../components/ToastProvider';

const TYPE_META: Record<string, { label: string; color: 'primary' | 'success' | 'warning' | 'error' }> = {
  text: { label: '逐句练习', color: 'primary' },
  audio: { label: '听力课程', color: 'success' },
  video: { label: '视频课程', color: 'warning' },
  music: { label: '音乐跟读', color: 'error' },
};

export default function Course() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const tokens = useAuthStore((s) => s.tokens);
  const init = useAuthStore((s) => s.init);
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['course-pack', id],
    queryFn: () => api.coursePackDetail(id, tokens),
    enabled: !!id,
  });

  const joinMut = useMutation({
    mutationFn: () => api.joinCoursePack(id, tokens),
    onSuccess: () => {
      toast('已加入', 'success');
      void init();
    },
  });

  const practice = (courseId: string, type?: string) => {
    const q = type ? `&type=${type}` : '';
    navigate(`/practice?courseId=${courseId}${q}`);
  };

  if (isLoading) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>📖 加载中…</Typography></Box></div>
    );
  }
  if (!data) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🤔 未找到课程包</Typography></Box></div>
    );
  }

  return (
    <div className="page-shell">
      <Card sx={{ p: 3.5, color: '#fff', background: 'linear-gradient(135deg, #5b6cff 0%, #8b5cf6 100%)', boxShadow: '0 8px 20px rgba(91,108,255,0.35)', border: 'none', mb: 2.5 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, mb: 1.5 }}>🎯</Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.35rem' }}>{data.title}</Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, lineHeight: 1.6 }}>{data.description}</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
          <Chip size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} label={data.level} />
          {data.tags.map((t) => (
            <Chip key={t} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} label={t} />
          ))}
        </Box>
      </Card>

      {!data.joined ? (
        <Button variant="contained" color="primary" fullWidth size="large" disabled={joinMut.isPending} onClick={() => joinMut.mutate()} sx={{ mb: 2 }}>
          {joinMut.isPending ? '加入中…' : '加入学习'}
        </Button>
      ) : (
        <Card variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>✓</Avatar>
          <Typography sx={{ color: 'success.main', fontWeight: 600 }}>已加入，开始学习吧！</Typography>
        </Card>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>课程目录</Typography>
        <Typography variant="body2" color="text.secondary">{data.courses.length} 门课程</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        {data.courses.map((c, i) => (
          <Card key={c.id} variant="outlined">
            <CardActionArea sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }} onClick={() => practice(c.id, c.type)}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 16, fontWeight: 700 }}>{i + 1}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                <Typography variant="body2" color="text.secondary">{c.sentenceCount} 句 · 已学 {c.userProgress ?? 0}%</Typography>
              </Box>
              <Chip size="small" color={TYPE_META[c.type]?.color ?? 'default'} label={TYPE_META[c.type]?.label ?? c.type} />
              <Typography color="text.disabled">›</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </div>
  );
}