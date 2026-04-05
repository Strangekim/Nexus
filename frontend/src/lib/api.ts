// API 요청 유틸리티 — credentials: include로 세션 쿠키 자동 전송

import { API_URL } from './constants';

/** API 에러 클래스 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** API 요청 함수 — 모든 요청에 쿠키 포함, body 있을 때만 Content-Type 설정 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // Fastify는 application/json content-type에 빈 body를 허용하지 않음
  const hasBody = options?.body != null;
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: { code: 'UNKNOWN', message: '알 수 없는 오류' },
    }));
    throw new ApiError(
      res.status,
      body.error?.code || 'UNKNOWN',
      body.error?.message || '요청 실패',
    );
  }

  return res.json();
}
