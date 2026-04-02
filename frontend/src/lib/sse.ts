// SSE 파서 — fetch + ReadableStream 기반 (POST 지원)

import { API_URL } from './constants';

export interface SseCallbacks {
  onEvent: (event: string, data: unknown) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

/** POST 기반 SSE 연결 — ReadableStream으로 청크 단위 파싱 */
export function connectSse(
  path: string,
  body: object,
  callbacks: SseCallbacks,
  signal?: AbortSignal,
): void {
  fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ||
            'SSE 연결 실패',
        );
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // AbortSignal 수신 시 reader를 명시적으로 취소하여 스트림 즉시 종료
      if (signal) {
        signal.addEventListener('abort', () => {
          reader.cancel();
        });
      }

      // try-finally로 reader 정리 보장 — 오류·abort 시에도 반드시 cancel 호출
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            let eventType = 'message';
            let data = '';

            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              else if (line.startsWith('data: ')) data = line.slice(6);
            }

            if (data) {
              try {
                callbacks.onEvent(eventType, JSON.parse(data));
              } catch {
                /* 파싱 실패 무시 */
              }
            }
          }
        }

        callbacks.onClose?.();
      } finally {
        // 스트림이 이미 닫혀 있어도 cancel은 안전하게 호출 가능
        reader.cancel();
      }
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    });
}
