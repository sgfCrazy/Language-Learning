import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  learning: { label: '学习中', badge: 'badge-warn' },
  mastered: { label: '已掌握', badge: 'badge-success' },
};

export default function Vocab() {
  const tokens = useAuthStore((s) => s.tokens);
  const qc = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const { data } = useQuery({
    queryKey: ['vocab'],
    queryFn: () => api.listVocab(tokens),
    enabled: !!tokens,
  });

  const addMut = useMutation({
    mutationFn: (word: string) => api.addVocab(word, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
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
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔒</View><Text className="loading-text">请先登录</Text></View>
      </View>
    );
  }

  const items = (data?.items as Array<{ id: string; word: string; status: string; dueAt: string }>) ?? [];

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">生词本</Text>
        <Text className="page-sub">收录你标记的生词，反复巩固</Text>
      </View>

      <View className="card" style={{ padding: '28rpx', marginBottom: '28rpx' }}>
        <View style={{ display: 'flex', gap: '16rpx', alignItems: 'center' }}>
          <View className="input-wrap" style={{ flex: 1, height: '84rpx' }}>
            <Input placeholder="输入要收藏的生词" value={newWord} onInput={(e) => setNewWord(e.detail.value)} />
          </View>
          <View
            className="btn btn-primary"
            style={{ height: '84rpx', padding: '0 36rpx', fontSize: 'var(--font-small)' }}
            onClick={() => { if (newWord.trim()) { addMut.mutate(newWord.trim()); setNewWord(''); } }}
          >
            ＋ 添加
          </View>
        </View>
      </View>

      <View className="section-title">
        <Text>全部生词</Text>
        <Text className="more">{items.length} 个</Text>
      </View>

      {items.length === 0 && (
        <View className="center-slot">
          <View className="empty-icon">📒</View>
          <Text className="loading-text">还没有生词，练习时点击「标记生词」收藏</Text>
        </View>
      )}

      <View className="grid-list">
        {items.map((v) => (
          <View key={v.id} className="card grid-item" style={{ padding: '24rpx 28rpx' }}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '20rpx' }}>
              <View className="avatar-brand avatar-sm" style={{ background: v.status === 'mastered' ? 'var(--success)' : 'var(--grad-brand)' }}>
                {v.word.slice(0, 1).toUpperCase()}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 700, color: 'var(--ink-900)' }}>{v.word}</Text>
                <Text className={`badge ${STATUS_META[v.status]?.badge ?? 'badge-ink'}`} style={{ marginTop: '8rpx' }}>
                  {STATUS_META[v.status]?.label ?? v.status}
                </Text>
              </View>
              {v.status !== 'mastered' && (
                <View className="btn btn-mini btn-mini-success" onClick={() => masterMut.mutate(v.id)}>✓ 掌握</View>
              )}
              <View className="btn btn-mini btn-mini-danger" onClick={() => removeMut.mutate(v.id)}>删除</View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
