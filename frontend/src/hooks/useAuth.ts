// 인증 상태 관리 훅

'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchMe } from '@/services/api/auth';
import { useAuthStore } from '@/stores/authStore';

/** 인증 상태를 조회하고 스토어에 동기화하는 훅 */
export function useAuth() {
  const { setUser, setLoading } = useAuthStore();

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    // 아직 로딩 중이면 무시 (isPending 상태 처리)
    if (query.isPending) return;
    if (query.isSuccess) {
      setUser(query.data);
      setLoading(false);
    }
    if (query.isError) {
      setUser(null);
      setLoading(false);
    }
  }, [query.isPending, query.isSuccess, query.isError, query.data, setUser, setLoading]);

  return query;
}
