// 커밋 API 함수 — 커밋 목록, diff, revert

import { apiFetch } from '@/lib/api';
import type { CommitListResponse, CommitDiffResponse, RevertResponse } from '@/types/commit';

/** 커밋 목록 조회 쿼리 파라미터 */
export interface CommitListParams {
  page?: number;
  limit?: number;
  sessionId?: string;
  author?: string;
  since?: string;
  until?: string;
}

/** 커밋 목록 조회 */
export async function fetchCommits(
  projectId: string,
  params: CommitListParams = {},
): Promise<CommitListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.sessionId) searchParams.set('sessionId', params.sessionId);
  if (params.author) searchParams.set('author', params.author);
  if (params.since) searchParams.set('since', params.since);
  if (params.until) searchParams.set('until', params.until);

  const query = searchParams.toString();
  return apiFetch<CommitListResponse>(
    `/api/projects/${projectId}/commits${query ? `?${query}` : ''}`,
  );
}

/** 커밋 Diff 조회 */
export async function fetchCommitDiff(
  projectId: string,
  hash: string,
): Promise<CommitDiffResponse> {
  return apiFetch<CommitDiffResponse>(`/api/projects/${projectId}/commits/${hash}/diff`);
}

/** 커밋 Revert */
export async function revertCommit(
  projectId: string,
  hash: string,
): Promise<RevertResponse> {
  return apiFetch<RevertResponse>(`/api/projects/${projectId}/commits/${hash}/revert`, {
    method: 'POST',
  });
}
