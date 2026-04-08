// 오디오 라이브러리 API 함수

import { apiFetch } from '@/lib/api';

/** 오디오 에셋 타입 */
export interface AudioAsset {
  id: string;
  fileName: string;
  s3Key: string;
  major: string;
  mid: string;
  sub: string | null;
  mood: string[];
  tags: string[];
  description: string;
  duration: number | null;
  format: string;
  fileSize: number;
}

/** 검색 결과 (유사도 포함) */
export interface AudioSearchResult extends AudioAsset {
  similarity: number;
  s3Url: string;
}

/** 카테고리 트리 노드 */
export interface CategoryNode {
  major: string;
  children: { mid: string; children: string[]; count: number }[];
  count: number;
}

/** 페이지네이션 응답 */
export interface AudioListResponse {
  items: AudioAsset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 라이브러리 통계 */
export interface AudioStats {
  total: number;
  byMajor: { major: string; count: number }[];
  byFormat: { format: string; count: number }[];
}

/** 텍스트 기반 유사도 검색 */
export async function searchAudio(
  query: string,
  filters?: { major?: string; mid?: string; sub?: string },
  limit = 20,
): Promise<AudioSearchResult[]> {
  const res = await apiFetch<{ results: AudioSearchResult[] }>('/api/audio/search', {
    method: 'POST',
    body: JSON.stringify({ query, modality: 'text', filters, limit }),
  });
  return res.results;
}

/** 카테고리 트리 조회 */
export async function fetchCategories(): Promise<CategoryNode[]> {
  const res = await apiFetch<{ categories: CategoryNode[] }>('/api/audio/categories');
  return res.categories;
}

/** 오디오 목록 조회 (카테고리 필터 + 페이지네이션) */
export async function fetchAudioList(params: {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}): Promise<AudioListResponse> {
  const qs = new URLSearchParams();
  if (params.major) qs.set('major', params.major);
  if (params.mid) qs.set('mid', params.mid);
  if (params.sub) qs.set('sub', params.sub);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return apiFetch<AudioListResponse>(`/api/audio?${qs.toString()}`);
}

/** 단건 조회 + presigned URL */
export async function fetchAudioById(id: string): Promise<AudioAsset & { s3Url: string }> {
  const res = await apiFetch<{ asset: AudioAsset & { s3Url: string } }>(`/api/audio/${id}`);
  return res.asset;
}

/** 스트리밍용 presigned URL */
export async function fetchStreamUrl(id: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/api/audio/${id}/stream`);
  return res.url;
}

/** 다운로드용 presigned URL */
export async function fetchDownloadUrl(id: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(`/api/audio/${id}/download`);
  return res.url;
}

/** 라이브러리 통계 */
export async function fetchAudioStats(): Promise<AudioStats> {
  const res = await apiFetch<{ stats: AudioStats }>('/api/audio/stats');
  return res.stats;
}
