'use client';
// Skills 편집기 TanStack Query 훅 — CLAUDE.md + Skills 디렉토리 관리

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchClaudeMd,
  saveClaudeMd,
  fetchSkillsList,
  fetchSkillDetail,
  createSkill,
  updateSkill,
  toggleSkill,
  deleteSkill,
} from '@/services/api/skills';

/** CLAUDE.md 조회 훅 */
export function useClaudeMd(projectId: string) {
  return useQuery({
    queryKey: ['skills', 'claude-md', projectId],
    queryFn: () => fetchClaudeMd(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/** CLAUDE.md 저장 뮤테이션 */
export function useSaveClaudeMd(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => saveClaudeMd(projectId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'claude-md', projectId] });
    },
  });
}

/** 스킬 목록 조회 훅 */
export function useSkillsList(projectId: string) {
  return useQuery({
    queryKey: ['skills', 'list', projectId],
    queryFn: () => fetchSkillsList(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/** 스킬 상세 조회 훅 — name 있을 때만 */
export function useSkillDetail(projectId: string, name: string | null) {
  return useQuery({
    queryKey: ['skills', 'detail', projectId, name],
    queryFn: () => fetchSkillDetail(projectId, name!),
    enabled: !!projectId && !!name,
  });
}

/** 스킬 생성 뮤테이션 */
export function useCreateSkill(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      createSkill(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'list', projectId] });
    },
  });
}

/** 스킬 수정 뮤테이션 */
export function useUpdateSkill(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; description: string; content: string }) =>
      updateSkill(projectId, params.name, {
        description: params.description,
        content: params.content,
      }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'list', projectId] });
      queryClient.invalidateQueries({ queryKey: ['skills', 'detail', projectId, params.name] });
    },
  });
}

/** 스킬 토글 뮤테이션 */
export function useToggleSkill(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => toggleSkill(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'list', projectId] });
    },
  });
}

/** 스킬 삭제 뮤테이션 */
export function useDeleteSkill(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteSkill(projectId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'list', projectId] });
    },
  });
}
