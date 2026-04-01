// 사이드바 트리 데이터 훅

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTree } from '@/services/api/projects';

/** 사이드바 트리 조회 훅 */
export function useTree() {
  return useQuery({
    queryKey: ['tree'],
    queryFn: fetchTree,
  });
}
