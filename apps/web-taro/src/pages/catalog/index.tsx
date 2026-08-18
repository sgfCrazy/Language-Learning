import { useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const LEVEL_META: Record<string, { label: string; badge: string }> = {
  beginner: { label: 'beginner', badge: 'badge-success' },
  intermediate: { label: 'intermediate', badge: 'badge-brand' },
  advanced: { label: 'advanced', badge: 'badge-danger' },
};

export default function Catalog() {
  const tokens = useAuthStore((s) => s.tokens);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const [q, setQ] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['course-packs', level, q],
    queryFn: () => api.listCoursePacks({ level, q }, tokens),
  });

  const goDetail = (id: string) => Taro.navigateTo({ url: `/pages/course/index?id=${id}` });

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">课程商城</Text>
        <Text className="page-sub">精选课程包，循序渐进提升英语能力</Text>
      </View>

      <View className="input-wrap" style={{ marginBottom: '24rpx' }}>
        <Input placeholder="搜索课程" value={q} onInput={(e) => setQ(e.detail.value)} />
      </View>

      <View className="pill-row" style={{ marginBottom: '28rpx' }}>
        {['', 'beginner', 'intermediate', 'advanced'].map((l) => (
          <Text
            key={l || 'all'}
            className={`pill ${level === l || (!level && !l) ? 'active' : ''}`}
            onClick={() => setLevel(l || undefined)}
          >
            {l || '全部'}
          </Text>
        ))}
      </View>

      {isLoading && (
        <View className="center-slot">
          <View className="empty-icon">📚</View>
          <Text className="loading-text">加载中…</Text>
        </View>
      )}

      {!isLoading && (!data || data.items.length === 0) && (
        <View className="center-slot">
          <View className="empty-icon">🔍</View>
          <Text className="loading-text">没有找到相关课程</Text>
        </View>
      )}

      {data?.items.map((p) => (
        <View key={p.id} className="card card-press" onClick={() => goDetail(p.id)}>
          <View style={{ display: 'flex', alignItems: 'center', gap: '24rpx' }}>
            <View className="avatar-brand">{p.title.slice(0, 1)}</View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ display: 'block', fontSize: 'var(--font-title)', fontWeight: 700, color: 'var(--ink-900)' }}>{p.title}</Text>
              <Text className="muted" style={{ display: 'block', marginTop: '10rpx', fontSize: 'var(--font-small)', lineHeight: 1.5 }}>{p.description}</Text>
              <View style={{ display: 'flex', gap: '12rpx', marginTop: '16rpx', alignItems: 'center' }}>
                <Text className={`badge ${LEVEL_META[p.level]?.badge ?? 'badge-ink'}`}>{LEVEL_META[p.level]?.label ?? p.level}</Text>
                {p.tags.map((t) => (
                  <Text key={t} className="badge badge-ink">{t}</Text>
                ))}
              </View>
            </View>
            <Text style={{ fontSize: '32rpx', color: 'var(--ink-300)' }}>›</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
