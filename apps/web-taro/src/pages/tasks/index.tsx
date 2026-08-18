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

  if (!tokens) return <View><Text>请先登录</Text></View>;
  if (isLoading) return <View><Text>加载中…</Text></View>;

  return (
    <View className="tasks">
      <Text className="title">每日任务</Text>
      {(data?.items as Array<{ id: string; type: string; target: number; reward: number; completed: boolean; progress: number }>)?.map((t) => (
        <View key={t.id} className="task-row">
          <Text>{TASK_LABELS[t.type] ?? t.type}: {t.progress}/{t.target}</Text>
          <Text className="reward">奖励 {t.reward} 金币</Text>
          <Text className={t.completed ? 'done' : 'pending'}>{t.completed ? '已完成' : '未完成'}</Text>
        </View>
      )) ?? <Text>暂无任务</Text>}
    </View>
  );
}
