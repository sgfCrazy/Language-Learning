import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

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
      // 刷新详情
      void init();
    },
  });

  const practice = (courseId: string) => {
    Taro.navigateTo({ url: `/pages/practice/index?courseId=${courseId}` });
  };

  if (isLoading) return <View><Text>加载中…</Text></View>;
  if (!data) return <View><Text>未找到</Text></View>;

  return (
    <View className="course">
      <Text className="title">{data.title}</Text>
      <Text className="desc">{data.description}</Text>
      {!data.joined && (
        <Button loading={joinMut.isPending} onClick={() => joinMut.mutate()}>
          加入学习
        </Button>
      )}
      <View className="courses">
        {data.courses.map((c) => (
          <View key={c.id} className="row" onClick={() => practice(c.id)}>
            <Text>{c.title}</Text>
            <Text className="meta">{c.sentenceCount} 句 · {c.userProgress ?? 0}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
