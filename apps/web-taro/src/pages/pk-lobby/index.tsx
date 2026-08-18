import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
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

  if (!tokens) {
    return (
      <View className="page-shell">
        <View className="center-slot"><View className="empty-icon">🔒</View><Text className="loading-text">请先登录</Text></View>
      </View>
    );
  }

  const rooms = (data?.items as PkRoomRow[]) ?? [];

  return (
    <View className="page-shell">
      <View className="page-header">
        <Text className="page-title">对战大厅</Text>
        <Text className="page-sub">邀请好友，一决高下</Text>
      </View>

      <View className="pk-action-grid" style={{ marginBottom: '28rpx' }}>
        <View className="pk-action" onClick={() => createMut.mutate('public')}>
          <Text className="pk-action-icon">🏠</Text>
          <Text className="pk-action-label">创建公开房间</Text>
          <Text className="pk-action-desc">任何人都可加入</Text>
        </View>
        <View className="pk-action" onClick={() => createMut.mutate('private')}>
          <Text className="pk-action-icon">🔒</Text>
          <Text className="pk-action-label">创建私密房间</Text>
          <Text className="pk-action-desc">输入房间号加入</Text>
        </View>
        <View className="pk-action" onClick={() => matchMut.mutate()}>
          <Text className="pk-action-icon">⚔️</Text>
          <Text className="pk-action-label">随机匹配</Text>
          <Text className="pk-action-desc">匹配实力相当的对手</Text>
        </View>
        <View className="pk-action">
          <Text className="pk-action-icon">🏆</Text>
          <Text className="pk-action-label">排行榜</Text>
          <Text className="pk-action-desc">查看对战战绩</Text>
        </View>
      </View>

      <View className="card" style={{ padding: '28rpx', marginBottom: '28rpx' }}>
        <Text style={{ display: 'block', fontSize: 'var(--font-small)', color: 'var(--ink-400)', marginBottom: '16rpx' }}>加入私密房间</Text>
        <View style={{ display: 'flex', gap: '16rpx', alignItems: 'center' }}>
          <View className="input-wrap" style={{ flex: 1, height: '84rpx' }}>
            <Input placeholder="输入 6 位房间号" maxlength={6} value={code} onInput={(e) => setCode(e.detail.value)} />
          </View>
          <View
            className="btn btn-primary"
            style={{ height: '84rpx', padding: '0 36rpx', fontSize: 'var(--font-small)', opacity: code.length === 6 ? 1 : 0.5 }}
            onClick={() => codeMut.mutate(code)}
          >
            加入
          </View>
        </View>
      </View>

      <View className="section-title">
        <Text>公开房间</Text>
        <Text className="more">{rooms.length} 个等待中</Text>
      </View>

      {rooms.length === 0 && (
        <View className="center-slot" style={{ padding: '60rpx 0' }}>
          <View className="empty-icon">🎮</View>
          <Text className="loading-text">暂无等待中的房间</Text>
          <View className="btn btn-primary" style={{ marginTop: '12rpx' }} onClick={() => matchMut.mutate()}>匹配一个对手</View>
        </View>
      )}

      <View className="grid-list">
        {rooms.map((r) => (
          <View key={r.roomId} className="card grid-item" style={{ padding: '24rpx 28rpx' }} onClick={() => joinMut.mutate(r.roomId)}>
            <View style={{ display: 'flex', alignItems: 'center', gap: '20rpx' }}>
              <View className="avatar-brand avatar-sm" style={{ background: r.status === 'ready' ? 'var(--success)' : 'var(--grad-brand)' }}>
                {r.status === 'ready' ? '⚔' : '⏳'}
              </View>
              <View className="grow">
                <Text className="title">{r.players.map((p) => p.displayName).join(' vs ') || '等待玩家'}</Text>
                <Text className="meta">{r.questionCount} 题 · {r.status === 'ready' ? '已就绪' : '等待中'}</Text>
              </View>
              <View className="btn btn-mini btn-mini-ghost">加入</View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
