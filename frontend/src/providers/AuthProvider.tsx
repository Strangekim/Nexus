'use client';

// 인증 프로바이더 — 앱 초기 로드 시 인증 상태 확인

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

/** 인증 상태 로딩 중 스플래시 화면 */
function AuthLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: '#1A1A2E' }}
    >
      <Loader2
        className="size-8 animate-spin"
        style={{ color: '#2D7D7B' }}
      />
    </div>
  );
}

/** 인증 상태를 확인하고 로딩 중 스플래시를 표시하는 프로바이더 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
