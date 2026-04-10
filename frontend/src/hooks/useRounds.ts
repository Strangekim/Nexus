// 라운드 + 골드셋 + 카테고리 TanStack Query 훅
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  closeRound,
  createRound,
  fetchCategoryTree,
  fetchGoldSet,
  fetchGoldSetStats,
  fetchRoundDetail,
  fetchRoundResults,
  fetchRounds,
  submitResponse,
} from '@/services/api/rounds';

/** 카테고리 마스터 트리 (분류 셀렉터용) */
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: fetchCategoryTree,
    staleTime: 30 * 60 * 1000,
  });
}

/** 라운드 목록 */
export function useRounds() {
  return useQuery({
    queryKey: ['rounds'],
    queryFn: fetchRounds,
  });
}

/** 라운드 상세 */
export function useRoundDetail(id: string | null) {
  return useQuery({
    queryKey: ['rounds', id],
    queryFn: () => fetchRoundDetail(id!),
    enabled: !!id,
  });
}

/** 라운드 결과 (관리자) */
export function useRoundResults(id: string | null) {
  return useQuery({
    queryKey: ['rounds', id, 'results'],
    queryFn: () => fetchRoundResults(id!),
    enabled: !!id,
  });
}

/** 라운드 생성 */
export function useCreateRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRound,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

/** 라운드 마감 */
export function useCloseRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeRound,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['rounds', id] });
    },
  });
}

/** 응답 제출 + 자동 판정 */
export function useSubmitResponse(roundId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      itemId: string;
      major: string;
      mid: string;
      sub: string | null;
    }) => submitResponse(params.itemId, params.major, params.mid, params.sub),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rounds', roundId] });
      qc.invalidateQueries({ queryKey: ['rounds'] });
      qc.invalidateQueries({ queryKey: ['gold-set'] });
    },
  });
}

/** 골드셋 목록 */
export function useGoldSet(params: {
  major?: string;
  mid?: string;
  sub?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['gold-set', params],
    queryFn: () => fetchGoldSet(params),
  });
}

/** 골드셋 통계 */
export function useGoldSetStats() {
  return useQuery({
    queryKey: ['gold-set', 'stats'],
    queryFn: fetchGoldSetStats,
    staleTime: 60 * 1000,
  });
}
