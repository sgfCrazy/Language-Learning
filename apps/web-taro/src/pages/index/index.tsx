import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getPlatformAdapter } from '@app/shared';
import { useAuthStore } from '../../store/auth';

const NAV = [
  { label: '导入影视 / 歌曲', icon: '＋', tint: '#f26b4d', url: '/pages/import/index' },
  { label: '课程商城', icon: '🛍️', tint: '#5b6cff', url: '/pages/catalog/index' },
  { label: '每日任务', icon: '🎯', tint: '#22c55e', url: '/pages/tasks/index' },
  { label: '排行榜', icon: '🏆', tint: '#f59e0b', url: '/pages/leaderboard/index' },
  { label: '复习本', icon: '🔁', tint: '#0ea5e9', url: '/pages/review/index' },
  { label: '生词本', icon: '📒', tint: '#8b5cf6', url: '/pages/vocab/index' },
  { label: '成长记录', icon: '📈', tint: '#ec4899', url: '/pages/growth/index' },
  { label: '对战大厅', icon: '⚔️', tint: '#f0435a', url: '/pages/pk-lobby/index' },
  { label: '刷新会话', icon: '↻', tint: '#64748b', action: 'init' },
];

export default function Index() {
  const adapter = (() => {
    try {
      return getPlatformAdapter();
    } catch {
      return null;
    }
  })();
  const platform = adapter?.platform ?? 'unknown';
  const { userId, init, logout } = useAuthStore();

  const onTap = (item: { url?: string; action?: string }) => {
    if (item.action === 'init') {
      void init();
      return;
    }
    if (item.url) Taro.navigateTo({ url: item.url });
  };

  return (
    <View className="page-shell">
      <View className="home-hero">
        <Text className="home-hero-title">Language Learning</Text>
        <Text className="home-hero-sub">每天 10 分钟，轻松开口说英语</Text>
        <Text className="home-hero-badge">
          {userId ? `👤 ${userId.slice(0, 8)}` : '🚀 开始你的学习之旅'}
        </Text>
      </View>

      <View className="stat-grid" style={{ marginBottom: '28rpx' }}>
        <View className="stat-card">
          <Text className="stat-num">{platform}</Text>
          <Text className="stat-label">运行平台</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{userId ? '已登录' : '未登录'}</Text>
          <Text className="stat-label">账号状态</Text>
        </View>
        <View className="stat-card">
          <Text className="stat-num">{userId ? '✓' : '—'}</Text>
          <Text className="stat-label">会话</Text>
        </View>
      </View>

      {userId ? (
        <View className="card" style={{ marginBottom: '28rpx', display: 'flex', alignItems: 'center', gap: '24rpx' }}>
          <View className="avatar-brand">{userId.slice(0, 1).toUpperCase()}</View>
          <View className="grow" style={{ flex: 1 }}>
            <Text className="list-row-title" style={{ display: 'block', fontWeight: 600, color: 'var(--ink-900)' }}>欢迎回来</Text>
            <Text className="muted" style={{ display: 'block', fontSize: 'var(--font-small)', marginTop: '6rpx' }}>继续坚持，你会看到进步</Text>
          </View>
          <Text className="badge badge-brand" onClick={() => logout()}>退出登录</Text>
        </View>
      ) : (
        <View className="btn btn-primary btn-block" onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>
          登录 / 注册
        </View>
      )}

      <View className="nav-grid">
        {NAV.map((item) => (
          <View key={item.label} className="nav-grid-tile" onClick={() => onTap(item)}>
            <View className="nav-grid-icon" style={{ background: `${item.tint}1a` }}>
              <Text style={{ fontSize: '40rpx' }}>{item.icon}</Text>
            </View>
            <Text className="nav-grid-label">{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
