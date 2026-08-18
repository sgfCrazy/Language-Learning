import { useState } from 'react';
import { View, Text, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

interface PkRoomRow {
  roomId: string;
  status: string;
  players: { displayName: string }[];
  questionCount: number;
}

export default function PkLobby() {
  const tokens = useAuthStore((s) => s.tokens);
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const { data } = useQuery({
    queryKey: ['pk-rooms'],
    queryFn: () => api.pkListRooms(tokens),
    enabled: !!tokens,
    refetchInterval: 5000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['pk-rooms'] });

  const createMut = useMutation({
    mutationFn: (mode: 'public' | 'private') => api.pkCreateRoom({ mode, questionCount: 5 }, tokens),
    onSuccess: (room) => {
      const r = room as { roomId: string };
      invalidate();
      Taro.navigateTo({ url: `/pages/pk-battle/index?roomId=${r.roomId}` });
    },
  });

  const joinMut = useMutation({
    mutationFn: (id: string) => api.pkJoinRoom(id, tokens),
    onSuccess: (room) => {
      const r = room as { roomId: string };
      Taro.navigateTo({ url: `/pages/pk-battle/index?roomId=${r.roomId}` });
    },
  });

  const codeMut = useMutation({
    mutationFn: (c: string) => api.pkJoinByCode(c, tokens),
    onSuccess: (room) => {
      const r = room as { roomId: string };
      Taro.navigateTo({ url: `/pages/pk-battle/index?roomId=${r.roomId}` });
    },
    onError: () => Taro.showToast({ title: '加入失败', icon: 'none' }),
  });

  const matchMut = useMutation({
    mutationFn: () => api.pkStartMatch(tokens),
    onSuccess: (res) => {
      if (res.queued) {
        Taro.showToast({ title: '匹配中…', icon: 'none' });
        setTimeout(() => matchMut.mutate(), 2500);
      } else if (res.room) {
        const r = res.room as { roomId: string };
        Taro.navigateTo({ url: `/pages/pk-battle/index?roomId=${r.roomId}` });
      }
    },
  });

  if (!tokens) return <View><Text>请先登录</Text></View>;
  const rooms = (data?.items as PkRoomRow[]) ?? [];

  return (
    <View className="pk-lobby">
      <Text className="title">对战大厅</Text>
      <View className="actions">
        <Button loading={createMut.isPending} onClick={() => createMut.mutate('public')}>创建公开房间</Button>
        <Button loading={createMut.isPending} onClick={() => createMut.mutate('private')}>创建私密房间</Button>
        <Button loading={matchMut.isPending} onClick={() => matchMut.mutate()}>随机匹配</Button>
      </View>
      <View className="code-row">
        <Input placeholder="输入 6 位房间号加入" value={code} onInput={(e) => setCode(e.detail.value)} />
        <Button size="mini" disabled={code.length !== 6} onClick={() => codeMut.mutate(code)}>加入</Button>
      </View>
      <View className="rooms">
        <Text className="section-title">公开房间 ({rooms.length})</Text>
        {rooms.length === 0 && <Text className="empty">暂无等待中的房间</Text>}
        {rooms.length === 0 && <Button loading={matchMut.isPending} onClick={() => matchMut.mutate()}>匹配一个对手</Button>}
        {rooms.map((r) => (
          <View key={r.roomId} className="row">
            <View>
              <Text>{r.players.map((p) => p.displayName).join(' / ')}</Text>
              <Text className="meta">{r.questionCount} 题 · {r.status}</Text>
            </View>
            <Button size="mini" onClick={() => joinMut.mutate(r.roomId)}>加入</Button>
          </View>
        ))}
      </View>
    </View>
  );
}