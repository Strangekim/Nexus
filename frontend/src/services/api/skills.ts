// Skills API 함수 — CLAUDE.md 편집 + Skills 디렉토리 관리 (활성/비활성)
import { apiFetch } from '@/lib/api';

/** 파일 조회 응답 타입 */
export interface SkillFileResponse {
  content: string;
  lastModified: string | null;
}

/** 파일 저장 응답 타입 */
export interface SkillSaveResponse {
  success: boolean;
}

/** 스킬 요약 정보 */
export interface SkillSummary {
  name: string;
  description: string;
  enabled: boolean;
}

/** 스킬 상세 정보 */
export interface SkillDetail {
  name: string;
  description: string;
  content: string;
  enabled: boolean;
}

/** 전역 스킬 (읽기 전용) */
export interface GlobalSkill {
  name: string;
  description: string;
  source: 'user' | 'plugin';
  pluginName?: string;
}

const base = (projectId: string) => `/api/projects/${projectId}/skills`;

/** CLAUDE.md 내용 조회 */
export const fetchClaudeMd = (projectId: string) =>
  apiFetch<SkillFileResponse>(`${base(projectId)}/claude-md`);

/** CLAUDE.md 저장 */
export const saveClaudeMd = (projectId: string, content: string) =>
  apiFetch<SkillSaveResponse>(`${base(projectId)}/claude-md`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });

/** 스킬 목록 조회 */
export const fetchSkillsList = (projectId: string) =>
  apiFetch<{ skills: SkillSummary[] }>(`${base(projectId)}/list`);

/** 전역 스킬 목록 조회 (읽기 전용) */
export const fetchGlobalSkills = (projectId: string) =>
  apiFetch<{ skills: GlobalSkill[] }>(`${base(projectId)}/global`);

/** 스킬 상세 조회 */
export const fetchSkillDetail = (projectId: string, name: string) =>
  apiFetch<SkillDetail>(`${base(projectId)}/list/${encodeURIComponent(name)}`);

/** 새 스킬 생성 */
export const createSkill = (
  projectId: string,
  data: { name: string; description: string; content: string },
) =>
  apiFetch<SkillDetail>(`${base(projectId)}/list`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

/** 스킬 내용 수정 */
export const updateSkill = (
  projectId: string,
  name: string,
  data: { description: string; content: string },
) =>
  apiFetch<SkillDetail>(`${base(projectId)}/list/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

/** 스킬 활성/비활성 토글 */
export const toggleSkill = (projectId: string, name: string) =>
  apiFetch<{ name: string; enabled: boolean }>(
    `${base(projectId)}/list/${encodeURIComponent(name)}/toggle`,
    { method: 'PATCH' },
  );

/** 스킬 삭제 */
export const deleteSkill = (projectId: string, name: string) =>
  apiFetch<SkillSaveResponse>(`${base(projectId)}/list/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
