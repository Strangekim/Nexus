// 브랜치 목록 API 함수
import { apiFetch } from '@/lib/api';

/** 브랜치 항목 타입 */
export interface BranchItem {
  name: string;
  current: boolean;
  hash: string;
  status: 'latest' | 'ahead' | 'behind' | 'diverged';
  aheadCount: number;
  behindCount: number;
  author?: string;
}

/** 브랜치 목록 응답 타입 */
export interface BranchesResponse {
  branches: BranchItem[];
}

/** 프로젝트 브랜치 목록 조회 */
export const fetchBranches = (projectId: string) =>
  apiFetch<BranchesResponse>(`/api/projects/${projectId}/branches`);
