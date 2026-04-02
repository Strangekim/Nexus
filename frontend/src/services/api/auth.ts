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
  await apiFetch<void>('/api/auth/logout', { method: 'POST' });
}

/** 현재 로그인된 사용자 조회 */
export async function fetchMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

/** Claude API 키 저장 — 빈 문자열 전달 시 삭제 */
export async function saveClaudeApiKey(claudeAccount: string): Promise<User> {
  return apiFetch<User>('/api/auth/settings', {
    method: 'PATCH',
    body: JSON.stringify({ claudeAccount }),
  });
}
