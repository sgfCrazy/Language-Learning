import { useState } from 'react';
import { Box, Card, CardActionArea, Chip, TextField, Typography, Avatar, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const LEVEL_META: Record<string, { label: string; color: 'success' | 'primary' | 'error' }> = {
  beginner: { label: 'beginner', color: 'success' },
  intermediate: { label: 'intermediate', color: 'primary' },
  advanced: { label: 'advanced', color: 'error' },
};

const LEVELS = ['', 'beginner', 'intermediate', 'advanced'] as const;

export default function Catalog() {
  const navigate = useNavigate();
  const tokens = useAuthStore((s) => s.tokens);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['course-packs', level, q],
    queryFn: () => api.listCoursePacks({ level, q }, tokens),
  });

  const goDetail = (id: string) => navigate(`/course?id=${id}`);

  return (
    <div className="page-shell">
      <Typography className="page-title">课程商城</Typography>
      <Typography className="page-sub">精选课程包，循序渐进提升英语能力</Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="搜索课程"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {LEVELS.map((l) => (
          <Chip
            key={l || 'all'}
            label={l || '全部'}
            color={(!level && !l) || level === l ? 'primary' : 'default'}
            variant={(!level && !l) || level === l ? 'filled' : 'outlined'}
            onClick={() => setLevel(l || undefined)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Box>

      {isLoading && (
        <Box className="center-slot"><Typography>📚 加载中…</Typography></Box>
      )}

      {!isLoading && (!data || data.items.length === 0) && (
        <Box className="center-slot"><Typography>🔍 没有找到相关课程</Typography></Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        {data?.items.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardActionArea sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }} onClick={() => goDetail(p.id)}>
              <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, fontSize: 20 }}>{p.title.slice(0, 1)}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{p.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>{p.description}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                  <Chip size="small" color={LEVEL_META[p.level]?.color ?? 'default'} label={LEVEL_META[p.level]?.label ?? p.level} />
                  {p.tags.map((t) => (
                    <Chip key={t} size="small" variant="outlined" label={t} />
                  ))}
                </Box>
              </Box>
              <Typography color="text.disabled">›</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </div>
  );
}