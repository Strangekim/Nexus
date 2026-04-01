// SSE 파서 — fetch + ReadableStream 기반 (POST 지원)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    });
}
