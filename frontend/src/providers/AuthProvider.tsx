'use client';

// 인증 프로바이더 — 앱 초기 로드 시 인증 상태 확인 및 리다이렉트

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

/** 인증 상태 로딩 중 스플래시 화면 */
function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5EF]">
      <Loader2 className="size-8 animate-spin text-[#2D7D7B]" />
    </div>
  );
}

/** 인증 상태를 확인하고 리다이렉트를 처리하는 프로바이더 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth();
  // 개별 selector로 분리 — 불필요한 리렌더링 방지
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login');

  useEffect(() => {
    if (isLoading) return;

    // 미인증 상태에서 보호 페이지 접근 → 로그인으로
    if (!user && !isAuthPage) {
      router.replace(`/login?redirect=${pathname}`);
    }

    // 인증 상태에서 로그인 페이지 접근 → 메인으로
    if (user && isAuthPage) {
      router.replace('/');
    }
  }, [isLoading, user, isAuthPage, pathname, router]);

  if (isLoading) {
    return <AuthLoading />;
  }

  // 미인증인데 보호 페이지면 로딩 표시 (리다이렉트 대기)
  if (!user && !isAuthPage) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
