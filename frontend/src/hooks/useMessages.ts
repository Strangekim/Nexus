'use client';
// 메시지 히스토리 훅

import { useQuery } from '@tanstack/react-query';
import { fetchMessages } from '@/services/api/messages';

export function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: async () => {
      // API 결과를 그대로 반환 — 에러는 TanStack Query가 처리
      const result = await fetchMessages(sessionId);
      return result ?? { messages: [], total: 0 };
    },
    enabled: !!sessionId,
  });
}
