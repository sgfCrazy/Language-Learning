import { useState } from 'react';
import { Box, Button, Card, Chip, TextField, Typography, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';
import { useToast } from '../../components/ToastProvider';

const STATUS_META: Record<string, { label: string; color: 'warning' | 'success' }> = {
  learning: { label: '学习中', color: 'warning' },
  mastered: { label: '已掌握', color: 'success' },
};

export default function Vocab() {
  const tokens = useAuthStore((s) => s.tokens);
  const qc = useQueryClient();
  const toast = useToast();
  const [newWord, setNewWord] = useState('');

  const { data } = useQuery({
    queryKey: ['vocab'],
    queryFn: () => api.listVocab(tokens),
    enabled: !!tokens,
  });

  const addMut = useMutation({
    mutationFn: (word: string) => api.addVocab(word, tokens),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocab'] });
      toast('已添加', 'success');
    },
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.removeVocab(id, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const masterMut = useMutation({
    mutationFn: (id: string) => api.markVocabMastered(id, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  if (!tokens) {
    return (
      <div className="page-shell"><Box className="center-slot"><Typography>🔒 请先登录</Typography></Box></div>
    );
  }

  const items = (data?.items as Array<{ id: string; word: string; status: string; dueAt: string }>) ?? [];

  return (
    <div className="page-shell">
      <Typography className="page-title">生词本</Typography>
      <Typography className="page-sub">收录你标记的生词，反复巩固</Typography>

      <Card variant="outlined" sx={{ p: 2.5, mb: 3, maxWidth: 640, mx: 'auto' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="输入要收藏的生词"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newWord.trim()) {
                addMut.mutate(newWord.trim());
                setNewWord('');
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!newWord.trim()}
            onClick={() => { addMut.mutate(newWord.trim()); setNewWord(''); }}
          >
            添加
          </Button>
        </Box>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, maxWidth: 640, mx: 'auto' }}>
        <Typography sx={{ fontWeight: 800 }}>全部生词</Typography>
        <Typography variant="body2" color="text.secondary">{items.length} 个</Typography>
      </Box>

      {items.length === 0 && (
        <Box className="center-slot"><Typography>📒 还没有生词，练习时点击「标记生词」收藏</Typography></Box>
      )}

      <Box sx={{ maxWidth: 640, mx: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
        {items.map((v) => (
          <Card key={v.id} variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: v.status === 'mastered' ? 'success.main' : 'primary.main', fontWeight: 700 }}>{v.word.slice(0, 1).toUpperCase()}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{v.word}</Typography>
                <Chip size="small" color={STATUS_META[v.status]?.color ?? 'default'} label={STATUS_META[v.status]?.label ?? v.status} sx={{ mt: 0.5 }} />
              </Box>
              {v.status !== 'mastered' && (
                <Button size="small" color="success" variant="outlined" onClick={() => masterMut.mutate(v.id)}>✓ 掌握</Button>
              )}
              <Button size="small" color="error" variant="text" onClick={() => removeMut.mutate(v.id)}>删除</Button>
            </Box>
          </Card>
        ))}
      </Box>
    </div>
  );
}