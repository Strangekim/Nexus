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

/** API 요청 함수 — 모든 요청에 쿠키 포함 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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
