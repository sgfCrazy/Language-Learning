import { View, Text } from '@tarojs/components';
import { getPlatformAdapter } from '@app/shared';

export default function Index() {
  const adapter = (() => {
    try {
      return getPlatformAdapter();
    } catch {
      return null;
    }
  })();
  const platform = adapter?.platform ?? 'unknown';

  return (
    <View className="index">
      <Text>Language Learning MVP</Text>
      <Text>platform: {platform}</Text>
    </View>
  );
}
