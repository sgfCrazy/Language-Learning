import { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const { loginEmail, registerEmail, loginWxMiniapp, loading, error } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const submit = async () => {
    try {
      if (mode === 'login') {
        await loginEmail(email, password);
      } else {
        await registerEmail(email, password, displayName || `用户${Date.now() % 1000}`);
      }
      Taro.navigateBack();
    } catch {
      // 错误已写入 store.error
    }
  };

  return (
    <View className="page-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
      <View style={{ textAlign: 'center', marginTop: '-100rpx' }}>
        <Text style={{ fontSize: '64rpx' }}>🎓</Text>
      </View>
      <View className="auth-card">
        <Text className="auth-title">{mode === 'login' ? '欢迎回来' : '创建账号'}</Text>
        <Text className="auth-sub">{mode === 'login' ? '登录后继续你的学习之旅' : '30 秒开启高效学习'}</Text>

        {mode === 'register' && (
          <View className="field input-wrap">
            <Input placeholder="昵称" value={displayName} onInput={(e) => setDisplayName(e.detail.value)} />
          </View>
        )}
        <View className="field input-wrap">
          <Input placeholder="邮箱" value={email} onInput={(e) => setEmail(e.detail.value)} />
        </View>
        <View className="field input-wrap">
          <Input placeholder="密码" password value={password} onInput={(e) => setPassword(e.detail.value)} />
        </View>

        <View className="btn btn-primary btn-block" onClick={() => void submit()}>
          {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
        </View>

        <View style={{ marginTop: '24rpx', textAlign: 'center' }}>
          <Text
            className="muted"
            style={{ fontSize: 'var(--font-small)' }}
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            还没有账号？<Text style={{ color: 'var(--brand-600)', fontWeight: 600 }}>{mode === 'login' ? '去注册' : '去登录'}</Text>
          </Text>
        </View>

        {/* #ifdef WEAPP */}
        <View className="btn btn-ghost btn-block" style={{ marginTop: '24rpx' }} onClick={() => loginWxMiniapp()}>
          微信一键登录
        </View>
        {/* #endif */}
      </View>

      {error && (
        <View style={{ marginTop: '24rpx', textAlign: 'center' }}>
          <Text style={{ color: 'var(--danger)', fontSize: 'var(--font-small)' }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
