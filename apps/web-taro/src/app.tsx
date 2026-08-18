import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setPlatformAdapter } from '@app/shared';
import { createPlatformAdapter } from './platform/adapter';
import './app.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function App({ children }: PropsWithChildren<Record<string, unknown>>) {
  useLaunch(() => {
    setPlatformAdapter(createPlatformAdapter());
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default App;
