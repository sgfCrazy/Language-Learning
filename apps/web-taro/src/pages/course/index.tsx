import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const TYPE_META: Record<string, { label: string; badge: string }> = {
  text: { label: '逐句练习', badge: 'badge-brand' },
  audio: { label: '听力课程', badge: 'badge-success' },
  video: { label: '视频课程', badge: 'badge-warn' },
  music: { label: '音乐跟读', badge: 'badge-danger' },
};

export default function Course() {
  const router = useRouter();
  const id = (router.params.id as string) ?? '';
  const tokens = useAuthStore((s) => s.tokens);
  const init = useAuthStore((s) => s.init);

  const { data, isLoading } = useQuery({
    queryKey: ['course-pack', id],
    queryFn: () => api.coursePackDetail(id, tokens),
  });

  const joinMut = useMutation({
    mutationFn: () => api.joinCoursePack(id, tokens),
    onSuccess: () => {
      Taro.showToast({ title: '已加入', icon: 'success' });
      void init();
    },
  });

  const practice = (courseId: string, type?: string) => {
    const q = type ? `&type=${type}` : '';
    Taro.navigateTo({ url: `/pages/practice/index?courseId=${courseId}${q}` });
  };

  if (isLoading) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">📖</View><Text className="loading-text">加载中…</Text></View>
      </View>
    );
  }
  if (!data) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🤔</View><Text className="loading-text">未找到课程包</Text></View>
      </View>
    );
  }

  return (
    <View className="page-shell">
      <View className="card" style={{ background: 'var(--grad-brand)', color: '#fff', border: 'none', boxShadow: 'var(--shadow-brand)' }}>
        <View style={{ width: '88rpx', height: '88rpx', borderRadius: '24rpx', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '44rpx', marginBottom: '20rpx' }}>🎯</View>
        <Text style={{ display: 'block', fontSize: 'var(--font-display)', fontWeight: 700 }}>{data.title}</Text>
        <Text style={{ display: 'block', marginTop: '14rpx', fontSize: 'var(--font-small)', opacity: 0.9, lineHeight: 1.6 }}>{data.description}</Text>
        <View style={{ display: 'flex', gap: '12rpx', marginTop: '24rpx' }}>
          <Text className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{data.level}</Text>
          {data.tags.map((t) => (
            <Text key={t} className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{t}</Text>
          ))}
        </View>
      </View>

      {!data.joined ? (
        <View className="btn btn-primary btn-block" onClick={() => joinMut.mutate()}>
          {joinMut.isPending ? '加入中…' : '加入学习'}
        </View>
      ) : (
        <View className="card" style={{ display: 'flex', alignItems: 'center', gap: '20rpx' }}>
          <View className="avatar-brand" style={{ background: 'var(--success)', width: '64rpx', height: '64rpx' }}>✓</View>
          <Text style={{ fontSize: 'var(--font-body)', color: 'var(--success)', fontWeight: 600 }}>已加入，开始学习吧！</Text>
        </View>
      )}

      <View className="section-title" style={{ marginTop: '32rpx' }}>
        <Text>课程目录</Text>
        <Text className="more">{data.courses.length} 门课程</Text>
      </View>

      <View className="card" style={{ padding: '8rpx 32rpx' }}>
        {data.courses.map((c, i) => (
          <View key={c.id} className="list-row" onClick={() => practice(c.id, c.type)}>
            <View className="avatar-brand avatar-sm">{i + 1}</View>
            <View className="grow">
              <Text className="title">{c.title}</Text>
              <Text className="meta">{c.sentenceCount} 句 · 已学 {c.userProgress ?? 0}%</Text>
            </View>
            <Text className={`badge ${TYPE_META[c.type]?.badge ?? 'badge-ink'}`}>{TYPE_META[c.type]?.label ?? c.type}</Text>
            <Text style={{ fontSize: '28rpx', color: 'var(--ink-300)' }}>›</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
