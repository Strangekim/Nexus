'use client';
// 대시보드 TanStack Query 훅 — activity, stats, fileChanges, usage 조회

import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardActivity,
  fetchDashboardStats,
  fetchFileChanges,
  fetchDashboardUsage,
  type DashboardPeriod,
} from '@/services/api/dashboard';

/** 현재 활동 중인 세션 + 온라인 사용자 조회 훅 */
export function useDashboardActivity(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', 'activity', projectId],
    queryFn: () => fetchDashboardActivity(projectId),
    enabled: !!projectId,
    refetchInterval: 30_000, // 30초마다 자동 갱신
    staleTime: 15_000,
  });
}

/** 기간별 커밋/세션/메시지 통계 조회 훅 */
export function useDashboardStats(projectId: string, period: DashboardPeriod = 'week') {
  return useQuery({
    queryKey: ['dashboard', 'stats', projectId, period],
    queryFn: () => fetchDashboardStats(projectId, period),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

/** 파일별 변경 빈도 조회 훅 */
export function useFileChanges(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', 'file-changes', projectId],
    queryFn: () => fetchFileChanges(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

/** 사용자별 사용량 집계 조회 훅 */
export function useDashboardUsage(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', 'usage', projectId],
    queryFn: () => fetchDashboardUsage(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}
