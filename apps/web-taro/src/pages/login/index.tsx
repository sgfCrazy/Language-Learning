import { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
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
      // 成功后返回上一页
      Taro.navigateBack();
    } catch {
      // 错误已写入 store.error
    }
  };

  return (
    <View className="login">
      <Text>登录</Text>
      {mode === 'register' && (
        <Input placeholder="昵称" value={displayName} onInput={(e) => setDisplayName(e.detail.value)} />
      )}
      <Input placeholder="邮箱" value={email} onInput={(e) => setEmail(e.detail.value)} />
      <Input placeholder="密码" password value={password} onInput={(e) => setPassword(e.detail.value)} />
      <Button loading={loading} onClick={submit}>
        {mode === 'login' ? '登录' : '注册'}
      </Button>
      <Button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        切换到{mode === 'login' ? '注册' : '登录'}
      </Button>
      {/* 微信小程序端显示微信登录；Web 端的扫码登录在后续接入 */}
      {/* #ifdef WEAPP */}
      <Button onClick={() => loginWxMiniapp()}>微信登录</Button>
      {/* #endif */}
      {error && <Text className="error">{error}</Text>}
    </View>
  );
}
