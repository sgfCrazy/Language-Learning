import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const TASK_LABELS: Record<string, string> = {
  practice_count: '练习题目',
  combo_streak: '达成连击',
  study_duration: '学习时长(分钟)',
};

export default function Tasks() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data, isLoading } = useQuery({
    queryKey: ['daily-tasks'],
    queryFn: () => api.getDailyTasks(tokens),
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
        <View className="center-slot"><View className="empty-icon">🎯</View><Text className="loading-text">加载中…</Text></View>
      </View>
    );
  }

  const tasks = (data?.items as Array<{ id: string; type: string; target: number; reward: number; completed: boolean; progress: number }>) ?? [];
  const done = tasks.filter((t) => t.completed).length;

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">每日任务</Text>
        <Text className="page-sub">完成今日任务，领取金币奖励</Text>
      </View>

      <View className="stat-grid" style={{ marginBottom: '28rpx' }}>
        <View className="stat-card">
          <Text className="stat-num">{done}/{tasks.length}</Text>
          <Text className="stat-label">已完成</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">+{tasks.reduce((s, t) => s + (t.completed ? t.reward : 0), 0)}</Text>
          <Text className="stat-label">今日金币</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{tasks.length - done === 0 ? '✓' : tasks.length - done}</Text>
          <Text className="stat-label">剩余任务</Text>
        </View>
      </View>

      {tasks.length === 0 && (
        <View className="center-slot">
          <View className="empty-icon">🎯</View>
          <Text className="loading-text">暂无任务</Text>
        </View>
      )}

      <View className="card" style={{ padding: '8rpx 32rpx' }}>
        {tasks.map((t) => {
          const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
          return (
            <View key={t.id} className="task-row">
              <View className="avatar-brand avatar-sm" style={{ background: t.completed ? 'var(--success)' : 'var(--grad-brand)' }}>
                {t.completed ? '✓' : '·'}
              </View>
              <View className="grow">
                <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                  <Text className="title">{TASK_LABELS[t.type] ?? t.type}</Text>
                  <Text className={`badge ${t.completed ? 'badge-success' : 'badge-warn'}`}>{t.completed ? '已完成' : '进行中'}</Text>
                </View>
                <View className="progress-wrap">
                  <View className="progress-track">
                    <View className="progress-fill" style={{ width: `${pct}%` }} />
                  </View>
                </View>
              </View>
              <View style={{ textAlign: 'right' }}>
                <Text style={{ display: 'block', fontSize: 'var(--font-small)', fontWeight: 600, color: t.completed ? 'var(--success)' : 'var(--ink-900)' }}>
                  {t.progress}/{t.target}
                </Text>
                <Text style={{ display: 'block', marginTop: '8rpx', fontSize: 'var(--font-tiny)', color: 'var(--warn)' }}>🪙 +{t.reward}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
