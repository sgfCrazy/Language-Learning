import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
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
      <View className="ai-title">
        <Text style={{ fontSize: '32rpx' }}>🤖</Text>
        <Text>AI 学习助手 · 今日剩余免费 {freeLeft} 次</Text>
        {freeLeft <= 0 && (
          <Text className={`badge ${(quota?.balance ?? 0) > 0 ? 'badge-warn' : 'badge-danger'}`}>
            超出扣 {quota?.balance ?? 0} 金币
          </Text>
        )}
      </View>
      <View className="ai-input-row">
        <Input
          placeholder="问问这个句子的用法…"
          value={question}
          onInput={(e) => setQuestion(e.detail.value)}
        />
        <View
          className="btn btn-primary"
          style={{ height: '76rpx', padding: '0 36rpx', fontSize: 'var(--font-small)' }}
          onClick={() => askMut.mutate(question.trim())}
        >
          {askMut.isPending ? '…' : '发送'}
        </View>
      </View>
      {askMut.isError && !answer && <Text className="ai-error">发送失败，请重试</Text>}
      {answer ? <Text className="ai-answer">{answer}</Text> : null}
    </View>
  );
}
