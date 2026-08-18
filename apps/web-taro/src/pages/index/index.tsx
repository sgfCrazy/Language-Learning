import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getPlatformAdapter } from '@app/shared';
import { useAuthStore } from '../../store/auth';

export default function Index() {
  const adapter = (() => {
    try {
      return getPlatformAdapter();
    } catch {
      return null;
    }
  })();
  const platform = adapter?.platform ?? 'unknown';
  const { userId, init, logout } = useAuthStore();

  return (
    <View className="index">
      <Text>Language Learning MVP</Text>
      <Text>platform: {platform}</Text>
      <Text>userId: {userId ?? '未登录'}</Text>
      {userId ? (
        <Button onClick={() => logout()}>退出登录</Button>
      ) : (
        <Button onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>去登录</Button>
      )}
      <Button onClick={() => init()}>初始化会话</Button>
    </View>
  );
}
