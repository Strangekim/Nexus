// 프로젝트/폴더/세션 CRUD 뮤테이션 훅

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProject,
  createFolder,
  createSession,
  deleteProject,
  deleteFolder,
  deleteSession,
  updateProject,
  updateFolder,
  updateSession,
} from '@/services/api/projects';

/** 트리 무효화 유틸 */
function useInvalidateTree() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['tree'] });
}

/** 프로젝트 생성 뮤테이션 */
export function useCreateProject() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: createProject,
    onSuccess: invalidate,
  });
}

/** 프로젝트 수정 뮤테이션 */
export function useUpdateProject() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      updateProject(id, data),
    onSuccess: invalidate,
  });
}

/** 프로젝트 삭제 뮤테이션 */
export function useDeleteProject() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: invalidate,
  });
}

/** 폴더 생성 뮤테이션 */
export function useCreateFolder() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: { name: string; description?: string } }) =>
      createFolder(projectId, data),
    onSuccess: invalidate,
  });
}

/** 폴더 수정 뮤테이션 */
export function useUpdateFolder() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: ({ projectId, id, data }: { projectId: string; id: string; data: { name?: string } }) =>
      updateFolder(projectId, id, data),
    onSuccess: invalidate,
  });
}

/** 폴더 삭제 뮤테이션 */
export function useDeleteFolder() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: ({ projectId, id }: { projectId: string; id: string }) =>
      deleteFolder(projectId, id),
    onSuccess: invalidate,
  });
}

/** 세션 생성 뮤테이션 */
export function useCreateSession() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: createSession,
    onSuccess: invalidate,
  });
}

/** 세션 수정 뮤테이션 */
export function useUpdateSession() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string } }) =>
      updateSession(id, data),
    onSuccess: invalidate,
  });
}

/** 세션 삭제 뮤테이션 */
export function useDeleteSession() {
  const invalidate = useInvalidateTree();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: invalidate,
  });
}
