// 프로젝트/폴더/세션 API 함수

import { apiFetch } from '@/lib/api';
import type { TreeProject } from '@/types/project';

/** 사이드바 트리 조회 */
export async function fetchTree(): Promise<TreeProject[]> {
  return apiFetch<TreeProject[]>('/api/projects/tree');
}

/** 프로젝트 생성 */
export async function createProject(data: {
  name: string;
  repoPath: string;
  description?: string;
}) {
  return apiFetch('/api/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 프로젝트 수정 */
export async function updateProject(
  id: string,
  data: { name?: string; description?: string },
) {
  return apiFetch(`/api/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 프로젝트 삭제 */
export async function deleteProject(id: string) {
  return apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
}

/** 폴더 생성 */
export async function createFolder(
  projectId: string,
  data: { name: string; description?: string },
) {
  return apiFetch(`/api/projects/${projectId}/folders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 폴더 수정 */
export async function updateFolder(
  projectId: string,
  id: string,
  data: { name?: string; description?: string },
) {
  return apiFetch(`/api/projects/${projectId}/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 폴더 삭제 */
export async function deleteFolder(projectId: string, id: string) {
  return apiFetch(`/api/projects/${projectId}/folders/${id}`, {
    method: 'DELETE',
  });
}

/** 세션 생성 */
export async function createSession(data: {
  folderId: string;
  title: string;
}) {
  return apiFetch('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** 세션 수정 */
export async function updateSession(
  id: string,
  data: { title?: string },
) {
  return apiFetch(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** 세션 삭제 */
export async function deleteSession(id: string) {
  return apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
}
