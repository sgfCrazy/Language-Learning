import { useEffect, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAuthStore } from '../../store/auth';

export default function Login() {
  const { loginEmail, registerEmail, loginWxMiniapp, loading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFormError('');
    clearError();
  }, [mode, clearError]);

  const submit = async () => {
    const normalizedEmail = email.trim();
    const normalizedName = displayName.trim();
    setFormError('');
    try {
      if (mode === 'login') {
        await loginEmail(normalizedEmail, password);
      } else {
        await registerEmail(normalizedEmail, password, normalizedName || `用户${Date.now() % 1000}`);
      }
      Taro.navigateBack();
    } catch {
      // 错误已写入 store.error
    }
  };

  return (
    <View className="page-shell auth-page">
      <View className="auth-layout">
        <View className="auth-intro">
          <View className="auth-mark"><View className="auth-mark-icon">语</View><Text>句乐部 · Language Learning</Text></View>
          <Text className="auth-intro-title">每天一点点，真的会进步。</Text>
          <Text className="auth-intro-copy">把英语练习变成轻松、可持续的日常。听、说、拼句，一次只学一个小目标。</Text>
          <View className="auth-benefit"><View className="auth-benefit-dot" /><Text>10 分钟完成今日学习</Text></View>
          <View className="auth-benefit"><View className="auth-benefit-dot" /><Text>AI 陪练，随时解释你的疑问</Text></View>
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

        <View className="auth-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          <Text
            className="muted"
          >
            {mode === 'login' ? '还没有账号？' : '已经有账号？'}<Text className="auth-switch-link">{mode === 'login' ? '去注册' : '去登录'}</Text>
          </Text>
        </View>

        {/* #ifdef WEAPP */}
        <View className="btn btn-ghost btn-block" style={{ marginTop: '24rpx' }} onClick={() => loginWxMiniapp()}>
          微信一键登录
        </View>
        {/* #endif */}
        {(formError || error) && <Text className="auth-error">{formError || error}</Text>}
        </View>

      </View>
    </View>
  );
}
