'use client';
// 채팅 상태 관리 훅 — SSE 스트리밍 + 메시지 관리

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSse } from '@/lib/sse';
import { abortChat } from '@/services/api/messages';
import { useSseHandler } from './useSseHandler';
import type { Message, ActiveToolUse } from '@/types/message';

interface UseChatReturn {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolUses: ActiveToolUse[];
  error: string | null;
  sendMessage: (text: string) => void;
  retrySend: () => void;
  abort: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export function useChat(sessionId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolUses, setToolUses] = useState<ActiveToolUse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const textRef = useRef('');
  const rafRef = useRef<number | null>(null);
  // 마지막 전송 메시지 저장 — 에러 시 재시도에 사용
  const lastMessageRef = useRef<string>('');
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

  // 언마운트 시 진행 중인 RAF 취소 — 메모리 누수 방지
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** SSE 이벤트 핸들러 (별도 훅으로 분리) */
  const handleEvent = useSseHandler({
    sessionId, textRef, scheduleFlush,
    setStreamingText, setIsStreaming,
    setToolUses, setError, queryClient,
  });

  /** 메시지 전송 */
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;

      // 마지막 전송 메시지 저장 (재시도 대비)
      lastMessageRef.current = text;

      setMessages((prev) => [...prev, {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36), sessionId,
        role: 'user', type: 'text',
        content: text, createdAt: new Date().toISOString(),
      }]);
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
            // 연결 끊김 시에도 백엔드는 응답을 DB에 저장하므로 쿼리 재요청
            queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'messages'] });
            // 5초 후 에러 메시지 자동 제거 — 메시지가 정상 로드되면 에러가 남아있을 필요 없음
            setTimeout(() => setError(null), 5000);
          },
          onClose: () => {
            setIsStreaming(false);
            // done 이벤트 미수신 대비 안전장치 — 쿼리 갱신
            queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'messages'] });
          },
        },
        controller.signal,
      );
    },
    [sessionId, isStreaming, handleEvent, queryClient],
  );

  /** 마지막 메시지 재시도 — SSE 에러 후 동일 내용 재전송 */
  const retrySend = useCallback(() => {
    if (lastMessageRef.current) {
      sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  /** 스트리밍 중단 — 클라이언트 fetch 취소 + 백엔드 CLI 프로세스 종료 */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    // 백엔드에 CLI 프로세스 종료 요청 — 실패해도 무시 (이미 종료됐을 수 있음)
    abortChat(sessionId).catch(() => {});
    // 중단 후 DB에 저장된 부분 응답 반영
    queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'messages'] });
  }, [sessionId, queryClient]);

  return {
    messages, streamingText, isStreaming,
    toolUses, error, sendMessage, retrySend, abort, setMessages,
  };
}
