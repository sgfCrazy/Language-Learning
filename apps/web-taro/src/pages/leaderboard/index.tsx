import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const tokens = useAuthStore((s) => s.tokens);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.getLeaderboard(period, tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔒</View><Text className="loading-text">请先登录</Text></View>
      </View>
    );
  }

  const rows = (data?.items as Array<{ rank: number; displayName: string; score: number }>) ?? [];
  const podium = rows.slice(0, 3);

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">积分排行榜</Text>
        <Text className="page-sub">与全球学习者一较高下</Text>
      </View>

      <View className="pill-row" style={{ marginBottom: '28rpx' }}>
        {(['week', 'month', 'all'] as const).map((p) => (
          <Text key={p} className={`pill ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
            {p === 'week' ? '周榜' : p === 'month' ? '月榜' : '总榜'}
          </Text>
        ))}
      </View>

      <View className="card" style={{ marginBottom: '24rpx' }}>
        <View className="section-title" style={{ marginTop: 0 }}>
          <Text>我的排名</Text>
          <Text className="more">积分 {data?.myScore ?? 0}</Text>
        </View>
        <View style={{ display: 'flex', alignItems: 'center', gap: '20rpx' }}>
          <View className="avatar-brand">{data?.myRank ? `#${data.myRank}` : '—'}</View>
          <View>
            <Text style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--ink-900)' }}>我的位置</Text>
            <Text className="muted" style={{ display: 'block', marginTop: '6rpx', fontSize: 'var(--font-small)' }}>
              {data?.myRank ? `全站第 ${data.myRank} 名` : '尚未上榜'}
            </Text>
          </View>
        </View>
      </View>

      {podium.length > 0 && (
        <View style={{ display: 'flex', alignItems: 'flex-end', gap: '16rpx', marginBottom: '28rpx' }}>
          {podium.map((p) => {
            const heights = [180, 240, 130];
            return (
              <View key={p.rank} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12rpx' }}>
                <Text style={{ fontSize: '44rpx' }}>{MEDAL[p.rank - 1] ?? '🏅'}</Text>
                <Text className="avatar-brand avatar-sm">{p.displayName.slice(0, 1)}</Text>
                <View
                  style={{
                    width: '100%',
                    borderRadius: '18rpx 18rpx 0 0',
                    height: `${heights[p.rank - 1] ?? 100}rpx`,
                    background: p.rank === 1 ? 'linear-gradient(180deg,#ffe9b8,#f5a623)' : p.rank === 2 ? 'linear-gradient(180deg,#eef1f6,#c4ccd8)' : 'linear-gradient(180deg,#ffdfc9,#e0784e)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '16rpx',
                  }}
                >
                  <Text style={{ fontSize: 'var(--font-small)', fontWeight: 700, color: '#fff' }}>{p.score}</Text>
                </View>
                <Text style={{ fontSize: 'var(--font-tiny)', color: 'var(--ink-600)', fontWeight: 600 }}>{p.displayName}</Text>
              </View>
            );
          })}
        </View>
      )}

      {isLoading && (
        <View className="center-slot"><View className="empty-icon">🏆</View><Text className="loading-text">加载中…</Text></View>
      )}

      {!isLoading && rows.length === 0 && (
        <View className="center-slot"><View className="empty-icon">🏆</View><Text className="loading-text">暂无排名数据</Text></View>
      )}

      <View className="card" style={{ padding: '8rpx 32rpx' }}>
        {rows.slice(3).map((entry) => (
          <View key={entry.rank} className="rank-row">
            <Text className="rank-medal plain">#{entry.rank}</Text>
            <View className="avatar-brand avatar-sm">{entry.displayName.slice(0, 1)}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ display: 'block', fontSize: 'var(--font-body)', fontWeight: 600, color: 'var(--ink-900)' }}>{entry.displayName}</Text>
            </View>
            <Text style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: 'var(--warn)' }}>{entry.score}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
