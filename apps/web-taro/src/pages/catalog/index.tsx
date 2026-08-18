import { useState } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

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
    <View className="catalog">
      <View className="filters">
        <Input placeholder="搜索课程" value={q} onInput={(e) => setQ(e.detail.value)} />
        <View className="levels">
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
      </View>
      <ScrollView scrollY className="list">
        {isLoading && <Text>加载中…</Text>}
        {data?.items.map((p) => (
          <View key={p.id} className="card" onClick={() => goDetail(p.id)}>
            <Text className="title">{p.title}</Text>
            <Text className="desc">{p.description}</Text>
            <Text className="meta">{p.level} · {p.tags.join('/')}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
