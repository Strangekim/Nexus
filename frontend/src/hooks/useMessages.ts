'use client';
// 메시지 히스토리 훅 — 최신 메시지부터 표시 (마지막 페이지 로드)

import { useQuery } from '@tanstack/react-query';
import { fetchMessages } from '@/services/api/messages';

const MESSAGES_PER_PAGE = 50;

export function useMessages(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: async () => {
      // 1차: page=1로 total 확인
      const first = await fetchMessages(sessionId, 1, MESSAGES_PER_PAGE);
      if (!first || first.total <= MESSAGES_PER_PAGE) {
        // 전체 메시지가 한 페이지 이내면 그대로 반환
        return first ?? { messages: [], total: 0 };
      }

      // 2차: 마지막 페이지 계산 후 로드
      const lastPage = Math.ceil(first.total / MESSAGES_PER_PAGE);
      const last = await fetchMessages(sessionId, lastPage, MESSAGES_PER_PAGE);
      return last ?? { messages: [], total: 0 };
    },
    enabled: !!sessionId,
  });
}
