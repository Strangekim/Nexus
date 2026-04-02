// 프로젝트/폴더/세션 API 함수

import { apiFetch } from '@/lib/api';
import type { TreeProject, Project, Folder, Session } from '@/types/project';

/** 사이드바 트리 조회 */
export async function fetchTree(): Promise<TreeProject[]> {
  return apiFetch<TreeProject[]>('/api/projects/tree');
}

/** 프로젝트 생성 */
export async function createProject(data: {
  name: string;
  repoPath: string;
  description?: string;
}): Promise<Project> {
  return apiFetch<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 프로젝트 수정 */
export async function updateProject(
  id: string,
  data: { name?: string; description?: string },
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 프로젝트 삭제 */
export async function deleteProject(id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' });
}

/** 폴더 생성 */
export async function createFolder(
  projectId: string,
  data: { name: string; description?: string },
): Promise<Folder> {
  return apiFetch<Folder>(`/api/projects/${projectId}/folders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 폴더 수정 */
export async function updateFolder(
  projectId: string,
  id: string,
  data: { name?: string; description?: string },
): Promise<Folder> {
  return apiFetch<Folder>(`/api/projects/${projectId}/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 폴더 삭제 */
export async function deleteFolder(projectId: string, id: string): Promise<void> {
  return apiFetch<void>(`/api/projects/${projectId}/folders/${id}`, {
    method: 'DELETE',
  });
}

/** 세션 생성 — projectId 필수, folderId 선택 (없으면 프로젝트 직속) */
export async function createSession(data: {
  projectId: string;
  folderId?: string;
  title: string;
}): Promise<Session> {
  return apiFetch<Session>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 세션 수정 */
export async function updateSession(
  id: string,
  data: { title?: string },
): Promise<Session> {
  return apiFetch<Session>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 세션 삭제 */
export async function deleteSession(id: string): Promise<void> {
  return apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' });
}

/** 세션 단건 조회 (생성자, 락 정보 포함) */
export async function fetchSession(id: string): Promise<Session> {
  return apiFetch<Session>(`/api/sessions/${id}`);
}
