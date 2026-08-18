import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function Review() {
  const tokens = useAuthStore((s) => s.tokens);
  const { data, isLoading } = useQuery({
    queryKey: ['today-review'],
    queryFn: () => api.getTodayReview(tokens),
    enabled: !!tokens,
  });

  if (!tokens) return <View><Text>请先登录</Text></View>;
  if (isLoading) return <View><Text>加载中…</Text></View>;

  const sentences = (data?.sentences as Array<{ sentenceId: string; courseId: string; text: string; translation: string }>) ?? [];
  const vocab = (data?.vocab as Array<{ id: string; word: string; status: string }>) ?? [];

  return (
    <View className="review">
      <Text className="title">今日复习</Text>
      {sentences.length === 0 && vocab.length === 0 && <Text>今天没有需要复习的内容</Text>}

      {sentences.length > 0 && (
        <View className="section">
          <Text className="section-title">待复习句子 ({sentences.length})</Text>
          {sentences.map((s) => (
            <View key={s.sentenceId} className="row" onClick={() => Taro.navigateTo({ url: `/pages/practice/index?courseId=${s.courseId}` })}>
              <Text>{s.translation}</Text>
              <Text className="meta">{s.text}</Text>
            </View>
          ))}
        </View>
      )}

      {vocab.length > 0 && (
        <View className="section">
          <Text className="section-title">待复习生词 ({vocab.length})</Text>
          {vocab.map((v) => (
            <View key={v.id} className="row">
              <Text>{v.word}</Text>
              <Button size="mini" onClick={() => api.markVocabMastered(v.id, tokens)}>掌握</Button>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
