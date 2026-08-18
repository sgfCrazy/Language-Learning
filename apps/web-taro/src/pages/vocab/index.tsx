import { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function Vocab() {
  const tokens = useAuthStore((s) => s.tokens);
  const qc = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const { data } = useQuery({
    queryKey: ['vocab'],
    queryFn: () => api.listVocab(tokens),
    enabled: !!tokens,
  });

  const addMut = useMutation({
    mutationFn: (word: string) => api.addVocab(word, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => api.removeVocab(id, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const masterMut = useMutation({
    mutationFn: (id: string) => api.markVocabMastered(id, tokens),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  if (!tokens) return <View><Text>请先登录</Text></View>;

  const items = (data?.items as Array<{ id: string; word: string; status: string; dueAt: string }>) ?? [];

  return (
    <View className="vocab">
      <Text className="title">生词本</Text>
      <View className="add-row">
        <Input placeholder="输入生词" value={newWord} onInput={(e) => setNewWord(e.detail.value)} />
        <Button size="mini" onClick={() => { if (newWord.trim()) { addMut.mutate(newWord.trim()); setNewWord(''); } }}>添加</Button>
      </View>
      {items.map((v) => (
        <View key={v.id} className="row">
          <Text>{v.word}</Text>
          <Text className="status">{v.status}</Text>
          {v.status !== 'mastered' && (
            <Button size="mini" onClick={() => masterMut.mutate(v.id)}>掌握</Button>
          )}
          <Button size="mini" onClick={() => removeMut.mutate(v.id)}>删除</Button>
        </View>
      ))}
    </View>
  );
}
