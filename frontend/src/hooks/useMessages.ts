'use client';
// 메시지 히스토리 훅

import { useQuery } from '@tanstack/react-query';
import { fetchMessages } from '@/services/api/messages';

export function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: () => fetchMessages(sessionId),
    enabled: !!sessionId,
  });
}
