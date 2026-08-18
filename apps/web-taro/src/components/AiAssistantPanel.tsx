import { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
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
    <View className="ai-panel">
      <Text className="ai-title">AI 助手 · 今日剩余免费 {freeLeft} 次{freeLeft <= 0 ? ` · 超出扣 ${quota?.balance ?? 0} 金币` : ''}</Text>
      <View className="ai-input-row">
        <Input
          placeholder="问问这个句子的用法…"
          value={question}
          onInput={(e) => setQuestion(e.detail.value)}
        />
        <Button
          size="mini"
          disabled={!question.trim() || askMut.isPending}
          onClick={() => askMut.mutate(question.trim())}
        >
          {askMut.isPending ? '…' : '发送'}
        </Button>
      </View>
      {askMut.isError && !answer && <Text className="ai-error">发送失败，请重试</Text>}
      {answer ? <Text className="ai-answer">{answer}</Text> : null}
    </View>
  );
}
