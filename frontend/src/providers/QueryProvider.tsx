'use client';

// TanStack Query 프로바이더

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** QueryClient를 컴포넌트별로 생성하여 SSR 시 공유 문제 방지 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
