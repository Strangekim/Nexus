'use client';
// Skills 편집기 TanStack Query 훅 — CLAUDE.md / skills.md 조회·저장

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchClaudeMd,
  fetchSkillsMd,
  saveClaudeMd,
  saveSkillsMd,
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

/** skills.md 조회 훅 */
export function useSkillsMd(projectId: string) {
  return useQuery({
    queryKey: ['skills', 'skills-md', projectId],
    queryFn: () => fetchSkillsMd(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/** CLAUDE.md 저장 뮤테이션 훅 */
export function useSaveClaudeMd(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => saveClaudeMd(projectId, content),
    onSuccess: () => {
      // 저장 후 캐시 무효화로 최신 lastModified 반영
      queryClient.invalidateQueries({ queryKey: ['skills', 'claude-md', projectId] });
    },
  });
}

/** skills.md 저장 뮤테이션 훅 */
export function useSaveSkillsMd(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => saveSkillsMd(projectId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', 'skills-md', projectId] });
    },
  });
}
