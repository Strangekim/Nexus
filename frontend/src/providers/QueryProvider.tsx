'use client';

// TanStack Query 프로바이더 — 글로벌 에러 핸들러 + 오프라인 감지 포함

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';

/** API 에러 응답 타입 */
interface ApiError {
  error?: { code?: string; message?: string };
}

/** 에러에서 HTTP 상태 코드 추출 */
function getStatusCode(error: unknown): number | undefined {
  return (error as { status?: number; statusCode?: number })?.status
    ?? (error as { status?: number; statusCode?: number })?.statusCode;
}

/** QueryProvider 내부 — router 접근을 위해 자식 컴포넌트로 분리 */
function QueryProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => {
    /** 401 응답 시 로그인 페이지로 리다이렉트 */
    const handle401 = () => {
      router.push('/login');
    };

    return new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => {
          const status = getStatusCode(error);
          // 401 미인증 → 로그인 리다이렉트
          if (status === 401) {
            handle401();
          }
        },
      }),
      mutationCache: new MutationCache({
        onError: (error) => {
          const status = getStatusCode(error);
          // 뮤테이션에서도 401 감지
          if (status === 401) {
            handle401();
          }
        },
      }),
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: (failureCount, error) => {
            // 401/403/404는 재시도하지 않음
            const status = getStatusCode(error);
            if (status === 401 || status === 403 || status === 404) return false;
            return failureCount < 1;
          },
          // 불필요한 refetch 방지 — 30초간 캐시 유효
          staleTime: 30 * 1000,
        },
      },
    });
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/** QueryClient를 컴포넌트별로 생성하여 SSR 시 공유 문제 방지 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryProviderInner>{children}</QueryProviderInner>;
}
