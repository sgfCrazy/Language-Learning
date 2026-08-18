import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function Review() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data, isLoading } = useQuery({
    queryKey: ['today-review'],
    queryFn: () => api.getTodayReview(tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔒</View><Text className="loading-text">请先登录</Text></View>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔁</View><Text className="loading-text">加载中…</Text></View>
      </View>
    );
  }

  const sentences = (data?.sentences as Array<{ sentenceId: string; courseId: string; text: string; translation: string }>) ?? [];
  const vocab = (data?.vocab as Array<{ id: string; word: string; status: string }>) ?? [];

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">今日复习</Text>
        <Text className="page-sub">趁热打铁，巩固记忆</Text>
      </View>

      <View className="stat-grid" style={{ marginBottom: '28rpx' }}>
        <View className="stat-card">
          <Text className="stat-num">{sentences.length}</Text>
          <Text className="stat-label">待复习句子</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{vocab.length}</Text>
          <Text className="stat-label">待复习生词</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{sentences.length + vocab.length === 0 ? '✓' : sentences.length + vocab.length}</Text>
          <Text className="stat-label">总计</Text>
        </View>
      </View>

      {sentences.length === 0 && vocab.length === 0 && (
        <View className="center-slot">
          <View className="empty-icon">🎉</View>
          <Text className="loading-text">今天没有需要复习的内容</Text>
        </View>
      )}

      {sentences.length > 0 && (
        <View className="grid-list">
          <View className="card grid-item" style={{ padding: '8rpx 32rpx' }}>
            <View className="section-title" style={{ marginTop: '12rpx' }}><Text>待复习句子</Text><Text className="more">{sentences.length} 句</Text></View>
            {sentences.map((s) => (
              <View key={s.sentenceId} className="list-row" onClick={() => Taro.navigateTo({ url: `/pages/practice/index?courseId=${s.courseId}` })}>
                <View className="avatar-brand avatar-sm" style={{ background: 'var(--grad-brand-soft)', color: 'var(--brand-600)' }}>✏️</View>
                <View className="grow">
                  <Text className="title">{s.translation}</Text>
                  <Text className="meta">{s.text}</Text>
                </View>
                <Text style={{ fontSize: '32rpx', color: 'var(--ink-300)' }}>›</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {vocab.length > 0 && (
        <View className="grid-list">
          <View className="card grid-item" style={{ padding: '8rpx 32rpx' }}>
            <View className="section-title" style={{ marginTop: '12rpx' }}><Text>待复习生词</Text><Text className="more">{vocab.length} 个</Text></View>
            {vocab.map((v) => (
              <View key={v.id} className="word-card">
                <View className="avatar-brand avatar-sm" style={{ background: 'var(--grad-brand-soft)', color: 'var(--brand-600)' }}>📒</View>
                <View style={{ flex: 1 }}>
                  <Text style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--ink-900)' }}>{v.word}</Text>
                  <Text className="muted" style={{ display: 'block', marginTop: '6rpx', fontSize: 'var(--font-tiny)' }}>{v.status}</Text>
                </View>
                <View className="btn btn-mini btn-mini-success" onClick={() => api.markVocabMastered(v.id, tokens)}>✓ 掌握</View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
