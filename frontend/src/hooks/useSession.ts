'use client';
// 세션 단건 조회 훅 — 생성자/락 정보 포함

import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '@/services/api/projects';
import type { Session } from '@/types/project';

/** 세션 상세 데이터 조회 — Socket.IO 이벤트로 실시간 갱신, polling 불필요 */
export function useSession(sessionId: string) {
  return useQuery<Session>({
    queryKey: ['sessions', sessionId],
    queryFn: () => fetchSession(sessionId),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}
