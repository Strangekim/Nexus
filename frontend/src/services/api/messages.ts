// 메시지 API 함수

import { apiFetch } from '@/lib/api';
import type { Message } from '@/types/message';

/** 백엔드 메시지 목록 응답 형식 */
interface MessagesApiResponse {
  data: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** 세션 메시지 목록 조회 — 백엔드 { data, pagination } 형식을 { messages, total } 로 정규화 */
export async function fetchMessages(
  sessionId: string,
  page = 1,
  limit = 50,
): Promise<{ messages: Message[]; total: number }> {
  const res = await apiFetch<MessagesApiResponse>(
    `/api/sessions/${sessionId}/messages?page=${page}&limit=${limit}`,
  );
  return {
    messages: res.data,
    total: res.pagination.total,
  };
}

/** 진행 중인 채팅 중단 */
export async function abortChat(sessionId: string): Promise<void> {
  return apiFetch(`/api/sessions/${sessionId}/abort`, { method: 'POST' });
}
