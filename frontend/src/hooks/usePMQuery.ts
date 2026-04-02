'use client';
// PM 자연어 질의 훅 — SSE 스트리밍 + 응답 상태 관리

import { useState, useRef, useCallback } from 'react';
import { connectSse } from '@/lib/sse';

interface UsePMQueryReturn {
  /** 누적 응답 텍스트 */
  responseText: string;
  /** 스트리밍 진행 중 여부 */
  isStreaming: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** PM 질의 전송 */
  sendQuery: (projectId: string, message: string, folderId?: string) => void;
  /** 스트리밍 중단 */
  abort: () => void;
  /** 응답 초기화 */
  reset: () => void;
}

export function usePMQuery(): UsePMQueryReturn {
  const [responseText, setResponseText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  // RAF 배치 업데이트용 텍스트 버퍼
  const textRef = useRef('');
  const rafRef = useRef<number | null>(null);

  /** RAF로 배치 렌더링 — 빠른 스트림 텍스트 최적화 */
  const flushText = useCallback(() => {
    setResponseText(textRef.current);
    rafRef.current = null;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushText);
    }
  }, [flushText]);

  /** PM 질의 전송 */
  const sendQuery = useCallback((projectId: string, message: string, folderId?: string) => {
    if (!message.trim() || isStreaming) return;

    // 상태 초기화
    setError(null);
    setIsStreaming(true);
    textRef.current = '';
    setResponseText('');

    const controller = new AbortController();
    abortRef.current = controller;

    connectSse(
      `/api/projects/${projectId}/query`,
      { message, ...(folderId ? { folderId } : {}) },
      {
        onEvent: (event, data) => {
          if (event === 'assistant_text') {
            const d = data as { content?: string };
            if (d.content) {
              textRef.current += d.content;
              scheduleFlush();
            }
          } else if (event === 'system') {
            const d = data as { subtype?: string; message?: string };
            if (d.subtype === 'error') {
              setError(d.message ?? '알 수 없는 오류');
              setIsStreaming(false);
            }
          }
          // done 이벤트 — onClose에서 처리
        },
        onError: (err) => {
          setError(err.message);
          setIsStreaming(false);
        },
        onClose: () => {
          // 남은 텍스트 즉시 플러시
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          setResponseText(textRef.current);
          setIsStreaming(false);
        },
      },
      controller.signal,
    );
  }, [isStreaming, scheduleFlush]);

  /** 스트리밍 중단 */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  /** 응답 초기화 */
  const reset = useCallback(() => {
    textRef.current = '';
    setResponseText('');
    setError(null);
  }, []);

  return { responseText, isStreaming, error, sendQuery, abort, reset };
}
