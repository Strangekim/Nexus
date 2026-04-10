// 골드셋 라운드 + 응답 + 골드셋 + 카테고리 API 함수
import { apiFetch } from '@/lib/api';

/** 카테고리 트리 (마스터 데이터) */
export interface CategoryTreeNode {
  key: string;
  label: string;
  mids: { name: string; subs: string[] }[];
}

/** 라운드 요약 (목록용) */
export interface RoundSummary {
  id: string;
  title: string;
  status: 'open' | 'closed';
  itemCount: number;
  myProgress: number;
  creator: { id: string; name: string };
  createdAt: string;
  closedAt: string | null;
}

/** 라운드 상세 — items 포함 */
export interface RoundItem {
  id: string;
  audioAsset: {
    id: string;
    fileName: string;
    s3Key: string;
    duration: number | null;
    format: string;
  };
  status: 'pending' | 'agreed' | 'disagreed';
  responseCount: number;
  myResponse: { major: string; mid: string; sub: string | null } | null;
  agreed: { major: string; mid: string; sub: string | null } | null;
}

export interface RoundDetail {
  id: string;
  title: string;
  status: 'open' | 'closed';
  createdAt: string;
  creator: { id: string; name: string };
  items: RoundItem[];
}

/** 응답 제출 결과 */
export interface SubmitResponseResult {
  judged: boolean;
  agreed?: boolean;
}

/** 라운드 결과 (관리자) */
export interface RoundResults {
  summary: { total: number; agreed: number; disagreed: number; pending: number };
  items: {
    id: string;
    audioAsset: { id: string; fileName: string; s3Key: string };
    status: 'pending' | 'agreed' | 'disagreed';
    agreed: { major: string; mid: string; sub: string | null } | null;
    responses: {
      userId: string;
      userName: string;
      major: string;
      mid: string;
      sub: string | null;
    }[];
  }[];
}

/** 골드셋 항목 */
export interface GoldSetItem {
  id: string;
  audioAsset: {
    id: string;
    fileName: string;
    s3Key: string;
    duration: number | null;
    format: string;
    description: string;
    mood: string[];
    tags: string[];
    s3Url: string;
  };
  major: string;
  mid: string;
  sub: string | null;
  agreedBy: string[];
  confirmedAt: string;
  roundId: string | null;
}

export interface GoldSetListResponse {
  items: GoldSetItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GoldSetStats {
  total: number;
  totalAudio: number;
  coverage: number;
  byMajor: { major: string; count: number }[];
  byMid: { major: string; mid: string; count: number }[];
  recent: { day: string; count: number }[];
}

// ──────────── 카테고리 ────────────
export async function fetchCategoryTree(): Promise<CategoryTreeNode[]> {
  const res = await apiFetch<{ categories: CategoryTreeNode[] }>('/api/categories/tree');
  return res.categories;
}

// ──────────── 라운드 ────────────
export async function fetchRounds(): Promise<RoundSummary[]> {
  const res = await apiFetch<{ rounds: RoundSummary[] }>('/api/rounds');
  return res.rounds;
}

export async function fetchRoundDetail(id: string): Promise<RoundDetail> {
  const res = await apiFetch<{ round: RoundDetail }>(`/api/rounds/${id}`);
  return res.round;
}

export async function createRound(params: {
  title: string;
  count: number;
  strategy?: 'random' | 'sparse_category';
  excludeGoldSet?: boolean;
}): Promise<RoundSummary> {
  const res = await apiFetch<{ round: RoundSummary }>('/api/rounds', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.round;
}

export async function closeRound(id: string): Promise<void> {
  await apiFetch(`/api/rounds/${id}/close`, { method: 'POST' });
}

export async function fetchRoundResults(id: string): Promise<RoundResults> {
  return apiFetch<RoundResults>(`/api/rounds/${id}/results`);
}

export async function submitResponse(
  itemId: string,
  major: string,
  mid: string,
  sub: string | null,
): Promise<SubmitResponseResult> {
  return apiFetch<SubmitResponseResult>(`/api/rounds/items/${itemId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ major, mid, sub }),
  });
}

// ──────────── 골드셋 ────────────
export async function fetchGoldSet(params: {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}): Promise<GoldSetListResponse> {
  const qs = new URLSearchParams();
  if (params.major) qs.set('major', params.major);
  if (params.mid) qs.set('mid', params.mid);
  if (params.sub) qs.set('sub', params.sub);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetch<GoldSetListResponse>(`/api/gold-set?${qs.toString()}`);
}

export async function fetchGoldSetStats(): Promise<GoldSetStats> {
  const res = await apiFetch<{ stats: GoldSetStats }>('/api/gold-set/stats');
  return res.stats;
}
