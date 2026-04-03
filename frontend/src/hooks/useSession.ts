'use client';
// 세션 단건 조회 훅 — 생성자/락 정보 포함

import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '@/services/api/projects';
import type { Session } from '@/types/project';

/** 세션 상세 데이터 조회 (30초 stale time) */
export function useSession(sessionId: string) {
  return useQuery<Session>({
    queryKey: ['sessions', sessionId],
    queryFn: () => fetchSession(sessionId),
    enabled: !!sessionId,
    staleTime: 5_000,
    // 5초마다 자동 갱신 — 락 상태 등 실시간 변경 반영
    refetchInterval: 5_000,
  });
}
