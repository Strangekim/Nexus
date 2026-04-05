'use client';
// 메시지 히스토리 훅 — 역방향 무한 스크롤 + 낙관적 업데이트 헬퍼 (단일 source of truth)

import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { fetchMessages } from '@/services/api/messages';
import type { Message } from '@/types/message';

const MESSAGES_PER_PAGE = 50;

/** 무한 스크롤 페이지 1개 */
interface MessagesPage {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
}

/** 모든 페이지를 하나의 메시지 배열로 병합 */
function flattenPages(data: InfiniteData<MessagesPage> | undefined): Message[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((p) => p.messages);
}

/** 메시지 조회 훅 — 메시지 배열 + 낙관적 업데이트 API */
export function useMessages(sessionId: string) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['sessions', sessionId, 'messages'],
    queryFn: async ({ pageParam }) => {
      const result = await fetchMessages(sessionId, pageParam, MESSAGES_PER_PAGE);
      return result ?? { messages: [], total: 0, page: 1, totalPages: 1 };
    },
    initialPageParam: -1,
    getPreviousPageParam: (firstPage) => {
      if (firstPage.page <= 1) return undefined;
      return firstPage.page - 1;
    },
    getNextPageParam: () => undefined,
    enabled: !!sessionId,
  });

  /** 평탄화된 메시지 배열 — 메모이제이션 */
  const messages = useMemo(() => flattenPages(query.data), [query.data]);

  /** 낙관적 유저 메시지 추가 — 마지막 페이지에 삽입 */
  const appendOptimisticUserMessage = useCallback(
    (content: string) => {
      const tempMsg: Message = {
        id: `tmp-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
        sessionId,
        role: 'user',
        type: 'text',
        content,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['sessions', sessionId, 'messages'],
        (old) => {
          if (!old) {
            // 쿼리가 아직 초기화 안 됐으면 새 페이지 하나 생성
            return {
              pages: [{ messages: [tempMsg], total: 1, page: 1, totalPages: 1 }],
              pageParams: [-1],
            };
          }
          const lastIdx = old.pages.length - 1;
          const lastPage = old.pages[lastIdx];
          const newLastPage: MessagesPage = {
            ...lastPage,
            messages: [...lastPage.messages, tempMsg],
            total: lastPage.total + 1,
          };
          const newPages = [...old.pages];
          newPages[lastIdx] = newLastPage;
          return { ...old, pages: newPages };
        },
      );

      return tempMsg.id;
    },
    [sessionId, queryClient],
  );

  /** 서버 상태와 동기화 — invalidate 대신 refetch로 현재 페이지 수만 유지 */
  const refreshMessages = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'messages'] });
  }, [sessionId, queryClient]);

  /** 전체 리셋 — 무한 스크롤 페이지 초기화 후 마지막 페이지부터 재로드 */
  const resetMessages = useCallback(() => {
    queryClient.resetQueries({ queryKey: ['sessions', sessionId, 'messages'] });
  }, [sessionId, queryClient]);

  return {
    ...query,
    messages,
    appendOptimisticUserMessage,
    refreshMessages,
    resetMessages,
  };
}
