// 대시보드 API 함수 — activity, stats, fileChanges, usage 조회
import { apiFetch } from '@/lib/api';

export type DashboardPeriod = 'today' | 'week' | 'month';

/** 대시보드 activity 응답 타입 */
export interface ActivityResponse {
  lockedSessions: {
    id: string;
    title: string;
    lockedAt: string | null;
    branchName: string | null;
    locker: { id: string; name: string } | null;
    folder: { id: string; name: string } | null;
  }[];
  onlineUsers: ({ id: string; name: string } | null)[];
}

/** 대시보드 stats 응답 타입 */
export interface StatsResponse {
  period: DashboardPeriod;
  commitCount: number;
  sessionCount: number;
  messageCount: number;
  dailyCommits: { day: string; count: number }[];
}

/** 파일 변경 빈도 응답 타입 */
export interface FileChangesResponse {
  fileChanges: { file: string; count: number }[];
}

/** 사용량 응답 타입 */
export interface UsageResponse {
  usage: {
    userId: string;
    name: string;
    email: string;
    sessionCount: number;
    messageCount: number;
    totalDurationMs: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
  }[];
}

const base = (projectId: string) => `/api/projects/${projectId}/dashboard`;

export const fetchDashboardActivity = (projectId: string) =>
  apiFetch<ActivityResponse>(`${base(projectId)}/activity`);

export const fetchDashboardStats = (projectId: string, period: DashboardPeriod = 'week') =>
  apiFetch<StatsResponse>(`${base(projectId)}/stats?period=${period}`);

export const fetchFileChanges = (projectId: string) =>
  apiFetch<FileChangesResponse>(`${base(projectId)}/file-changes`);

export const fetchDashboardUsage = (projectId: string) =>
  apiFetch<UsageResponse>(`${base(projectId)}/usage`);
