// 메시지 API 함수

import { apiFetch } from '@/lib/api';
import type { Message } from '@/types/message';

/** 세션 메시지 목록 조회 */
export async function fetchMessages(
  sessionId: string,
  page = 1,
  limit = 50,
): Promise<{ messages: Message[]; total: number }> {
  return apiFetch(
    `/api/sessions/${sessionId}/messages?page=${page}&limit=${limit}`,
  );
}

/** 진행 중인 채팅 중단 */
export async function abortChat(sessionId: string): Promise<void> {
  return apiFetch(`/api/sessions/${sessionId}/abort`, { method: 'POST' });
}
