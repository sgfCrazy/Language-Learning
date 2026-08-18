import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function Leaderboard() {
  const tokens = useAuthStore((s) => s.tokens);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => api.getLeaderboard(period, tokens),
    enabled: !!tokens,
  });

  if (!tokens) return <View><Text>请先登录</Text></View>;

  return (
    <View className="leaderboard">
      <Text className="title">积分排行榜</Text>
      <View className="periods">
        {(['week', 'month', 'all'] as const).map((p) => (
          <Text
            key={p}
            className={`pill ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'week' ? '周榜' : p === 'month' ? '月榜' : '总榜'}
          </Text>
        ))}
      </View>
      {isLoading && <Text>加载中…</Text>}
      <View className="my-rank">
        <Text>我的排名: {data?.myRank ?? '-'} · 积分: {data?.myScore ?? 0}</Text>
      </View>
      <View className="list">
        {(data?.items as Array<{ rank: number; displayName: string; score: number }>)?.map((entry) => (
          <View key={entry.rank} className="row">
            <Text className="rank">#{entry.rank}</Text>
            <Text className="name">{entry.displayName}</Text>
            <Text className="score">{entry.score}</Text>
          </View>
        )) ?? <Text>暂无数据</Text>}
      </View>
    </View>
  );
}
