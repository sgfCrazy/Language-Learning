import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setPlatformAdapter } from '@app/shared';
import { createPlatformAdapter } from './platform';
import { useAuthStore } from './store/auth';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function App({ children }: PropsWithChildren<Record<string, unknown>>) {
  useLaunch(() => {
    setPlatformAdapter(createPlatformAdapter());
    // 初始化会话：尝试用本地 token 恢复登录态
    useAuthStore.getState().init();
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default App;
