'use client';
// 커밋 관련 TanStack Query 훅 — 목록 조회, diff 조회, revert

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCommits, fetchCommitDiff, revertCommit } from '@/services/api/commits';
import type { CommitListParams } from '@/services/api/commits';

/** 커밋 목록 조회 훅 */
export function useCommits(projectId: string, params: CommitListParams = {}) {
  return useQuery({
    queryKey: ['commits', projectId, params],
    queryFn: () => fetchCommits(projectId, params),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/** 커밋 Diff 조회 훅 */
export function useCommitDiff(projectId: string, hash: string) {
  return useQuery({
    queryKey: ['commit-diff', projectId, hash],
    queryFn: () => fetchCommitDiff(projectId, hash),
    enabled: !!projectId && !!hash,
    staleTime: 60_000,
  });
}

/** 커밋 Revert 뮤테이션 훅 */
export function useRevertCommit(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (hash: string) => revertCommit(projectId, hash),
    onSuccess: () => {
      // 커밋 목록 갱신
      qc.invalidateQueries({ queryKey: ['commits', projectId] });
    },
  });
}
