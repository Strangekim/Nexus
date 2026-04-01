---
name: tanstack-query
description: TanStack Query (React Query) 훅 작성 패턴
---
# TanStack Query 코드 패턴

## QueryClient 설정
```tsx
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,       // 1분간 fresh 유지
      retry: 1,                    // 실패 시 1회 재시도
      refetchOnWindowFocus: false, // 포커스 시 자동 리페치 비활성화
    },
  },
});
```

## Provider 설정
```tsx
// providers/QueryProvider.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## API 함수 분리
```typescript
// services/api/projects.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 목록 조회
export async function fetchProjects(page = 1, limit = 20) {
  const res = await fetch(`${API_URL}/api/projects?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('프로젝트 목록 조회 실패');
  return res.json();
}

// 단건 조회
export async function fetchProject(id: string) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('프로젝트 조회 실패');
  return res.json();
}

// 생성
export async function createProject(data: CreateProjectDto) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('프로젝트 생성 실패');
  return res.json();
}
```

## 커스텀 훅 패턴
```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, fetchProject, createProject } from '@/services/api/projects';

// 목록 조회 훅
export function useProjects(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['projects', { page, limit }],
    queryFn: () => fetchProjects(page, limit),
  });
}

// 단건 조회 훅
export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !!id, // id가 있을 때만 실행
  });
}

// 생성 뮤테이션 훅
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      // 목록 캐시 무효화 → 자동 리페치
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

## 컴포넌트에서 사용
```tsx
// components/project/ProjectList.tsx
'use client';

import { useProjects, useCreateProject } from '@/hooks/useProjects';

export function ProjectList() {
  const { data, isPending, error } = useProjects();
  const createMutation = useCreateProject();

  if (isPending) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <div>
      {data.data.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
      <button
        onClick={() => createMutation.mutate({ name: '새 프로젝트', repoUrl: '...' })}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? '생성 중...' : '프로젝트 추가'}
      </button>
    </div>
  );
}
```

## queryKey 컨벤션
```
['projects']                    — 프로젝트 목록
['projects', { page, limit }]  — 페이지네이션된 목록
['projects', projectId]        — 단건 프로젝트
['projects', projectId, 'sessions'] — 프로젝트의 세션 목록
['sessions', sessionId, 'messages'] — 세션의 메시지 목록
```

## 규칙
- 모든 주석은 한글로 작성
- API 함수는 `services/api/` 디렉토리에 도메인별 분리
- 커스텀 훅은 `hooks/` 디렉토리에 배치
- `credentials: 'include'` 필수 (세션 쿠키 전송)
- queryKey는 계층적 배열 구조 사용
