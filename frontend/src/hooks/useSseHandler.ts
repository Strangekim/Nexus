'use client';
// SSE 이벤트 핸들러 훅 — 스트리밍 이벤트를 상태로 변환

import { useCallback } from 'react';
import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { ActiveToolUse } from '@/types/message';
import type {
  AssistantTextEvent,
  ToolUseBeginEvent,
  ToolUseInputEvent,
  ToolResultEvent,
  SystemEvent,
} from '@/types/stream';

interface SseHandlerDeps {
  sessionId: string;
  textRef: MutableRefObject<string>;
  scheduleFlush: () => void;
  setStreamingText: Dispatch<SetStateAction<string>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setToolUses: Dispatch<SetStateAction<ActiveToolUse[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  queryClient: QueryClient;
}

/** SSE 이벤트별 핸들러 생성 */
export function useSseHandler(deps: SseHandlerDeps) {
  const {
    sessionId, textRef, scheduleFlush,
    setStreamingText, setIsStreaming,
    setToolUses, setError, queryClient,
  } = deps;

  return useCallback(
    (event: string, data: unknown) => {
      switch (event) {
        case 'assistant_text': {
          textRef.current += (data as AssistantTextEvent).content;
          scheduleFlush();
          break;
        }
        case 'tool_use_begin': {
          const { toolId, tool, summary } = data as ToolUseBeginEvent;
          setToolUses((p) => [...p, { toolId, tool, status: 'running', summary }]);
          break;
        }
        case 'tool_use_input': {
          const { toolId, input } = data as ToolUseInputEvent;
          setToolUses((p) => p.map((t) => (t.toolId === toolId ? { ...t, input } : t)));
          break;
        }
        case 'tool_use_end': {
          const { toolId } = data as { toolId: string };
          setToolUses((p) => p.map((t) => (t.toolId === toolId ? { ...t, status: 'completed' as const } : t)));
          break;
        }
        case 'tool_result': {
          const { toolId, output, isError, resultMeta } = data as ToolResultEvent;
          setToolUses((p) => p.map((t) => (t.toolId === toolId ? { ...t, output, isError, resultMeta, status: 'completed' as const } : t)));
          break;
        }
        case 'system': {
          const { subtype, message } = data as SystemEvent;
          if (subtype === 'error' && message) setError(message);
          break;
        }
        case 'done': {
          // 스트리밍 완료 — 스트림 상태만 정리, 캐시 갱신은 onClose 콜백에서 담당
          // (중복 invalidate 방지)
          textRef.current = '';
          setStreamingText('');
          setIsStreaming(false);
          setToolUses([]);
          // invalidateQueries로 서버 상태 동기화 (resetQueries는 페이지 경계 이동 문제)
          queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'messages'] });
          break;
        }
      }
    },
    [sessionId, textRef, scheduleFlush, setStreamingText, setIsStreaming, setToolUses, setError, queryClient],
  );
}
