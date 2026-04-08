// 오디오 라이브러리 TanStack Query 훅

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  searchAudio,
  fetchCategories,
  fetchAudioList,
  fetchAudioStats,
} from '@/services/api/audio';

/** 카테고리 트리 조회 훅 */
export function useAudioCategories() {
  return useQuery({
    queryKey: ['audio', 'categories'],
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
}

/** 오디오 목록 조회 훅 (카테고리 필터 + 페이지네이션) */
export function useAudioList(params: {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['audio', 'list', params],
    queryFn: () => fetchAudioList(params),
  });
}

/** 멀티모달 검색 훅 — 쿼리가 비어있으면 비활성화 */
export function useAudioSearch(
  query: string,
  modality: 'text' | 'image' | 'video' = 'text',
  filters?: { major?: string; mid?: string; sub?: string },
  limit = 20,
  mimeType?: string,
) {
  return useQuery({
    queryKey: ['audio', 'search', query, modality, filters, limit],
    queryFn: async () => {
      console.log('[오디오 검색]', { query: modality === 'text' ? query : `${modality} 파일`, modality, filters, limit });
      const results = await searchAudio(query, modality, filters, limit, mimeType);
      console.log('[오디오 검색 결과]', results.length, '건', results.slice(0, 3).map(r => ({ name: r.fileName, similarity: r.similarity })));
      return results;
    },
    enabled: query.trim().length > 0,
  });
}

/** 라이브러리 통계 훅 */
export function useAudioStats() {
  return useQuery({
    queryKey: ['audio', 'stats'],
    queryFn: fetchAudioStats,
    staleTime: 5 * 60 * 1000,
  });
}
