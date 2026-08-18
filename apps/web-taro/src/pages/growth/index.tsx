import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

interface GrowthItem {
  date: string;
  value: number;
}
interface HeatItem {
  date: string;
  count: number;
}

export default function Growth() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data: growth } = useQuery({
    queryKey: ['growth'],
    queryFn: () => api.growth(tokens),
    enabled: !!tokens,
  });
  const { data: heatmap } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => api.heatmap(tokens),
    enabled: !!tokens,
  });

  if (!tokens) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔒</View><Text className="loading-text">请先登录</Text></View>
      </View>
    );
  }

  const items = (growth?.items as GrowthItem[]) ?? [];
  const heats = (heatmap?.items as HeatItem[]) ?? [];
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const maxHeat = Math.max(1, ...heats.map((i) => i.count));

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">成长记录</Text>
        <Text className="page-sub">坚持看得见，进步摸得着</Text>
      </View>

      <View className="stat-grid" style={{ marginBottom: '28rpx' }}>
        <View className="stat-card">
          <Text className="stat-num">{items.length}</Text>
          <Text className="stat-label">学习天数</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{items.reduce((s, i) => s + i.value, 0)}</Text>
          <Text className="stat-label">累计积分</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{heats.length}</Text>
          <Text className="stat-label">活跃天数</Text>
        </View>
      </View>

      <View className="card">
        <View className="section-title" style={{ marginTop: 0 }}><Text>成长曲线</Text></View>
        {items.length === 0 ? (
          <View className="center-slot" style={{ padding: '60rpx 0' }}>
            <View className="empty-icon">📈</View>
            <Text className="loading-text">还没有学习数据</Text>
          </View>
        ) : (
          <View style={{ display: 'flex', alignItems: 'flex-end', gap: '12rpx', height: '260rpx', paddingTop: '20rpx' }}>
            {items.slice(-14).map((it, i) => (
              <View key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10rpx' }}>
                <Text style={{ fontSize: 'var(--font-tiny)', color: 'var(--ink-400)' }}>{it.value}</Text>
                <View
                  style={{
                    width: '100%',
                    maxWidth: '48rpx',
                    height: `${Math.max(8, (it.value / maxVal) * 180)}rpx`,
                    borderRadius: '12rpx 12rpx 6rpx 6rpx',
                    background: 'var(--grad-brand)',
                    opacity: 0.65 + (i / items.length) * 0.35,
                  }}
                />
                <Text style={{ fontSize: 'var(--font-tiny)', color: 'var(--ink-300)' }}>{it.date.slice(5)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="card">
        <View className="section-title" style={{ marginTop: 0 }}><Text>学习热力图</Text><Text className="more">{heats.length} 天</Text></View>
        {heats.length === 0 ? (
          <View className="center-slot" style={{ padding: '60rpx 0' }}>
            <View className="empty-icon">🔥</View>
            <Text className="loading-text">暂无学习记录</Text>
          </View>
        ) : (
          <View style={{ display: 'flex', flexWrap: 'wrap', gap: '14rpx' }}>
            {heats.slice(-42).map((h, i) => (
              <View key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8rpx' }}>
                <View
                  style={{
                    width: '56rpx',
                    height: '56rpx',
                    borderRadius: '14rpx',
                    background: h.count >= maxHeat * 0.7 ? 'var(--brand-500)' : h.count >= maxHeat * 0.4 ? 'var(--brand-100)' : 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 'var(--font-tiny)', color: h.count >= maxHeat * 0.4 ? '#fff' : 'var(--ink-300)' }}>{h.count}</Text>
                </View>
                <Text style={{ fontSize: '20rpx', color: 'var(--ink-300)' }}>{h.date.slice(5)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
