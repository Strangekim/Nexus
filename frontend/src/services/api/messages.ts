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

/** 세션 메시지 목록 조회 — 백엔드 응답 형식 정규화 */
export async function fetchMessages(
  sessionId: string,
  page = 1,
  limit = 50,
): Promise<{ messages: Message[]; total: number }> {
  const res = await apiFetch<MessagesApiResponse & { messages?: Message[] }>(
    `/api/sessions/${sessionId}/messages?page=${page}&limit=${limit}`,
  );
  // JSONL 응답: { messages, pagination }, DB 응답: { data, pagination }
  const messages = res.messages ?? res.data ?? [];
  return {
    messages,
    total: res.pagination.total,
  };
}

/** 진행 중인 채팅 중단 */
export async function abortChat(sessionId: string): Promise<void> {
  return apiFetch(`/api/sessions/${sessionId}/abort`, { method: 'POST' });
}
