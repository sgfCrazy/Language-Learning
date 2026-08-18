import { useState } from 'react';
import { Box, Button, Chip, TextField, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AiSentenceContext } from '@app/shared';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

interface AiAssistantPanelProps {
  context: AiSentenceContext;
}

export default function AiAssistantPanel({ context }: AiAssistantPanelProps) {
  const tokens = useAuthStore((s) => s.tokens);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const { data: quota } = useQuery({
    queryKey: ['ai-quota'],
    queryFn: () => api.getAiQuota(tokens),
    enabled: !!tokens,
  });

  const askMut = useMutation({
    mutationFn: (q: string) => api.askAi({ question: q, context }, tokens),
    onSuccess: (res) => {
      setAnswer(res.answer);
      setQuestion('');
    },
    onError: (err) => {
      const msg = (err as { message?: string })?.message ?? '提问失败';
      setAnswer(`⚠️ ${msg}`);
    },
  });

  const freeLeft = Math.max(0, (quota?.freeLimit ?? 2) - (quota?.freeUsed ?? 0));

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2, mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ mr: 0.5 }}>🤖</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>AI 学习助手 · 今日剩余免费 {freeLeft} 次</Typography>
        {freeLeft <= 0 && (
          <Chip size="small" color={(quota?.balance ?? 0) > 0 ? 'warning' : 'error'} label={`超出扣 ${quota?.balance ?? 0} 金币`} />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          placeholder="问问这个句子的用法…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!tokens}
        />
        <Button variant="contained" startIcon={<SendIcon />} disabled={askMut.isPending || !question.trim()} onClick={() => askMut.mutate(question.trim())}>
          {askMut.isPending ? <CircularProgress size={18} color="inherit" /> : '发送'}
        </Button>
      </Box>
      {askMut.isError && !answer && <Alert severity="error" sx={{ mt: 1.5 }}>发送失败，请重试</Alert>}
      {answer ? (
        <Typography variant="body2" sx={{ mt: 1.5, lineHeight: 1.7, color: 'text.primary', whiteSpace: 'pre-wrap' }}>{answer}</Typography>
      ) : null}
    </Paper>
  );
}