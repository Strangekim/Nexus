'use client';
// 메시지 히스토리 훅

import { useQuery } from '@tanstack/react-query';
import { fetchMessages } from '@/services/api/messages';
import { MOCK_MESSAGES } from '@/lib/mock-messages';

// 개발 환경에서만 목데이터 폴백 허용
const useMock = process.env.NODE_ENV === 'development';

export function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: async () => {
      try {
        const result = await fetchMessages(sessionId);
        // 개발 환경에서만 빈 결과 시 목데이터로 폴백
        if (useMock && (!result.messages || result.messages.length === 0)) {
          return { messages: MOCK_MESSAGES, total: MOCK_MESSAGES.length };
        }
        return result;
      } catch (err) {
        // 개발 환경에서만 API 실패 시 목데이터로 폴백
        if (useMock) {
          return { messages: MOCK_MESSAGES, total: MOCK_MESSAGES.length };
        }
        throw err;
      }
    },
    enabled: !!sessionId,
  });
}
