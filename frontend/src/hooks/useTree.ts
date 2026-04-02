// 사이드바 트리 데이터 훅

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTree } from '@/services/api/projects';

/** 사이드바 트리 조회 훅 — API 결과를 그대로 반환, 에러는 TanStack Query가 처리 */
export function useTree() {
  return useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      const data = await fetchTree();
      return data ?? [];
    },
  });
}
