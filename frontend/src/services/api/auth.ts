// 인증 API 함수

import { apiFetch } from '@/lib/api';
import type { User } from '@/types/user';

/** 로그인 요청 */
export async function login(email: string, password: string): Promise<User> {
  return apiFetch<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/** 로그아웃 요청 */
export async function logout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST', body: '{}' });
}

/** 현재 로그인된 사용자 조회 */
export async function fetchMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

/** Claude OAuth 인증 시작 — authUrl을 반환, 팝업으로 열어 인증 진행 */
export async function startClaudeAuth(): Promise<{ authUrl: string }> {
  return apiFetch<{ authUrl: string }>('/api/auth/claude/start', { method: 'POST', body: '{}' });
}

/** Claude OAuth 콜백 — 인증 코드(또는 전체 URL)로 토큰 교환 */
export async function completeClaudeAuth(
  code: string,
): Promise<{ success: boolean; subscriptionType?: string }> {
  return apiFetch<{ success: boolean; subscriptionType?: string }>(
    '/api/auth/claude/callback',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
}

/** Claude OAuth 연동 해제 */
export async function disconnectClaude(): Promise<void> {
  await apiFetch<void>('/api/auth/claude/disconnect', { method: 'POST', body: '{}' });
}

/** Claude OAuth 연동 상태 조회 */
export async function getClaudeStatus(): Promise<{
  connected: boolean;
  subscriptionType?: string;
}> {
  return apiFetch<{ connected: boolean; subscriptionType?: string }>(
    '/api/auth/claude/status',
  );
}
