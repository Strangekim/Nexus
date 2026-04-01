'use client';
// 채팅 상태 관리 훅 — SSE 스트리밍 + 메시지 관리

import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSse } from '@/lib/sse';
import { useSseHandler } from './useSseHandler';
import type { Message, ActiveToolUse } from '@/types/message';

interface UseChatReturn {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolUses: ActiveToolUse[];
  error: string | null;
  sendMessage: (text: string) => void;
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

  /** SSE 이벤트 핸들러 (별도 훅으로 분리) */
  const handleEvent = useSseHandler({
    sessionId, textRef, scheduleFlush,
    setMessages, setStreamingText, setIsStreaming,
    setToolUses, setError, queryClient,
  });

  /** 메시지 전송 */
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), sessionId,
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
          onError: (err) => { setError(err.message); setIsStreaming(false); },
          onClose: () => { setIsStreaming(false); },
        },
        controller.signal,
      );
    },
    [sessionId, isStreaming, handleEvent],
  );

  /** 스트리밍 중단 */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages, streamingText, isStreaming,
    toolUses, error, sendMessage, abort, setMessages,
  };
}
