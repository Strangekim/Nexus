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

/** 텍스트 검색 훅 — 쿼리가 비어있으면 비활성화 */
export function useAudioSearch(
  query: string,
  filters?: { major?: string; mid?: string; sub?: string },
  limit = 20,
) {
  return useQuery({
    queryKey: ['audio', 'search', query, filters, limit],
    queryFn: () => searchAudio(query, filters, limit),
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
