'use client';
// 채팅 스트리밍 훅 — SSE 스트림 상태만 관리 (메시지는 useMessages가 SSOT)

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSse } from '@/lib/sse';
import { abortChat } from '@/services/api/messages';
import { useSseHandler } from './useSseHandler';
import type { ActiveToolUse } from '@/types/message';

interface UseChatReturn {
  streamingText: string;
  isStreaming: boolean;
  toolUses: ActiveToolUse[];
  error: string | null;
  sendMessage: (text: string) => void;
  retrySend: () => void;
  abort: () => void;
}

/** 낙관적 메시지 추가 콜백 — useMessages와 연동 */
interface UseChatOptions {
  onOptimisticUserMessage: (content: string) => void;
  onRefreshMessages: () => void;
}

export function useChat(sessionId: string, options: UseChatOptions): UseChatReturn {
  const { onOptimisticUserMessage, onRefreshMessages } = options;

  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolUses, setToolUses] = useState<ActiveToolUse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef('');
  const rafRef = useRef<number | null>(null);
  // 마지막 전송 메시지 저장 — 에러 시 재시도에 사용
  const lastMessageRef = useRef<string>('');
  // 명시적 중지 플래그 — abort()에서 true, SSE 자연 종료에서는 false
  const userAbortedRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  /** RAF 배치 업데이트 — 텍스트 렌더 최적화 */
  const flushText = useCallback(() => {
    setStreamingText(textRef.current);
    rafRef.current = null;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushText);
    }
  }, [flushText]);

  // 언마운트 시 진행 중인 RAF 취소
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** SSE 이벤트 핸들러 */
  const handleEvent = useSseHandler({
    sessionId, textRef, scheduleFlush,
    setStreamingText, setIsStreaming,
    setToolUses, setError, queryClient,
  });

  /** 메시지 전송 */
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;

      lastMessageRef.current = text;
      userAbortedRef.current = false;

      // 낙관적 유저 메시지 추가 (useMessages 캐시에 직접 삽입)
      onOptimisticUserMessage(text);

      setError(null);
      setIsStreaming(true);
      textRef.current = '';
      setStreamingText('');
      setToolUses([]);

      const controller = new AbortController();
      abortRef.current = controller;

      connectSse(
        `/api/sessions/${sessionId}/chat`,
        { message: text },
        {
          onEvent: handleEvent,
          onError: () => {
            setError('연결이 끊겼습니다. 응답이 이미 완료되었을 수 있습니다.');
            setIsStreaming(false);
            // 에러 시에만 서버 상태 재조회 (낙관적 메시지와 실제 DB 동기화)
            onRefreshMessages();
            setTimeout(() => setError(null), 5000);
          },
          onClose: () => {
            setIsStreaming(false);
            // 자연 close 시에만 새로고침 — 유저 중단(abort)은 done 이벤트에서 처리
            if (!userAbortedRef.current) {
              onRefreshMessages();
            }
          },
        },
        controller.signal,
      );
    },
    [sessionId, isStreaming, handleEvent, onOptimisticUserMessage, onRefreshMessages],
  );

  /** 마지막 메시지 재시도 */
  const retrySend = useCallback(() => {
    if (lastMessageRef.current) {
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  /** 명시적 중지 — 유저가 중지 버튼 클릭 */
  const abort = useCallback(() => {
    userAbortedRef.current = true;
    abortRef.current?.abort();
    setIsStreaming(false);
    // 백엔드 CLI 프로세스 종료 요청
    abortChat(sessionId).catch(() => {});
    // 명시적 중지 시에만 캐시 리셋 (부분 응답 반영)
    onRefreshMessages();
  }, [sessionId, onRefreshMessages]);

  return {
    streamingText, isStreaming, toolUses, error,
    sendMessage, retrySend, abort,
  };
}
