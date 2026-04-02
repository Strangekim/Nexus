// 실시간 동기화 프로바이더 — 클라이언트 컴포넌트
// layout.tsx가 Server Component이므로 별도 Client Component로 분리

'use client';

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

/** 메인 레이아웃에서 WebSocket 이벤트 구독을 초기화하는 클라이언트 컴포넌트 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // 프로젝트/세션 ID 없이 전역 이벤트만 구독 (룸별 구독은 각 페이지에서 처리)
  useRealtimeSync();

  return <>{children}</>;
}
