'use client';
// 브랜치 목록 TanStack Query 훅
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/services/api/branches';

/** 프로젝트 브랜치 목록 조회 훅 */
export function useBranches(projectId: string) {
  return useQuery({
    queryKey: ['branches', projectId],
    queryFn: () => fetchBranches(projectId),
    enabled: !!projectId,
    staleTime: 30_000, // 30초 캐시
    refetchInterval: 60_000, // 60초마다 자동 갱신
  });
}
