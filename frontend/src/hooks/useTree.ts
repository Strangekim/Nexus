// 사이드바 트리 데이터 훅

'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTree } from '@/services/api/projects';
import { useAuthStore } from '@/stores/authStore';

/** 사이드바 트리 조회 훅 — 관리자 전용 프로젝트는 비관리자에게 숨김 처리 */
export function useTree() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      const data = await fetchTree();
      return data ?? [];
    },
  });

  // 비관리자일 경우 isAdminOnly 프로젝트 필터링
  const filteredData = useMemo(() => {
    if (!query.data) return query.data;
    if (user?.role === 'admin') return query.data;
    return query.data.filter((project) => !project.isAdminOnly);
  }, [query.data, user?.role]);

  return { ...query, data: filteredData };
}
