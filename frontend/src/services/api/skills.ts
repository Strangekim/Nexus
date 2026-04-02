// Skills API 함수 — CLAUDE.md / .claude/skills.md 읽기·쓰기
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

/** skills.md 내용 조회 */
export const fetchSkillsMd = (projectId: string) =>
  apiFetch<SkillFileResponse>(`${base(projectId)}/skills-md`);

/** skills.md 저장 */
export const saveSkillsMd = (projectId: string, content: string) =>
  apiFetch<SkillSaveResponse>(`${base(projectId)}/skills-md`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
