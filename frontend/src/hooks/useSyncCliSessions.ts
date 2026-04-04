// CLI 세션 동기화 훅 — 관리자 전용 프로젝트의 CLI 세션을 DB로 가져오기

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncCliSessions } from '@/services/api/projects';

/** CLI 세션 동기화 mutation 훅 */
export function useSyncCliSessions(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncCliSessions(projectId),
    onSuccess: (data) => {
      // 동기화된 세션이 있으면 트리 새로고침
      if (data.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['tree'] });
      }
    },
  });
}
