import { View, Text } from '@tarojs/components';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

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

  if (!tokens) return <View><Text>请先登录</Text></View>;

  return (
    <View className="growth">
      <Text>成长曲线</Text>
      <View className="stats">
        {growth?.items?.map((it, i) => (
          <Text key={i}>{JSON.stringify(it)}</Text>
        )) ?? <Text>暂无数据</Text>}
      </View>
      <Text>学习热力图</Text>
      <View className="heatmap">
        {heatmap?.items?.map((it, i) => (
          <Text key={i}>{JSON.stringify(it)}</Text>
        )) ?? <Text>暂无数据</Text>}
      </View>
    </View>
  );
}
