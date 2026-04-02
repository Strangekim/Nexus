'use client';
// 메시지 히스토리 훅

import { useQuery } from '@tanstack/react-query';
import { fetchMessages } from '@/services/api/messages';
import { MOCK_MESSAGES } from '@/lib/mock-messages';

export function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: async () => {
      try {
        const result = await fetchMessages(sessionId);
        // API 결과가 비어 있으면 목데이터로 폴백 (UI 확인용)
        if (!result.messages || result.messages.length === 0) {
          return { messages: MOCK_MESSAGES, total: MOCK_MESSAGES.length };
        }
        return result;
      } catch {
        // API 호출 실패 시 목데이터로 폴백 (개발 환경 UI 확인용)
        return { messages: MOCK_MESSAGES, total: MOCK_MESSAGES.length };
      }
    },
    enabled: !!sessionId,
  });
}
