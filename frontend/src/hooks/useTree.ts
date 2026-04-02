// 사이드바 트리 데이터 훅

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTree } from '@/services/api/projects';
import type { TreeProject } from '@/types/project';

/** UI 확인용 목데이터 — API 응답이 비어있을 때 fallback으로 사용 */
const MOCK_TREE: TreeProject[] = [
  {
    id: 'mock-proj-1',
    name: 'Nexus Platform',
    type: 'project',
    sessions: [
      {
        id: 'mock-sess-3',
        title: '초기 세팅',
        status: 'active',
        lockedBy: null,
        type: 'session',
      },
    ],
    folders: [
      {
        id: 'mock-folder-1',
        name: '백엔드 작업',
        type: 'folder',
        sessions: [
          {
            id: 'mock-sess-1',
            title: '인증 시스템 구현',
            status: 'active',
            lockedBy: null,
            type: 'session',
          },
          {
            id: 'mock-sess-2',
            title: 'API 엔드포인트 설계',
            status: 'active',
            lockedBy: null,
            type: 'session',
          },
        ],
      },
    ],
  },
  {
    id: 'mock-proj-2',
    name: 'E-Commerce API',
    type: 'project',
    sessions: [],
    folders: [
      {
        id: 'mock-folder-2',
        name: 'DB 스키마 설계',
        type: 'folder',
        sessions: [
          {
            id: 'mock-sess-4',
            title: 'DB 스키마 설계',
            status: 'active',
            lockedBy: null,
            type: 'session',
          },
        ],
      },
    ],
  },
];

// 개발 환경에서만 목데이터 폴백 허용
const useMock = process.env.NODE_ENV === 'development';

/** 사이드바 트리 조회 훅 — 개발 환경에서만 빈 응답 시 목데이터 반환 */
export function useTree() {
  return useQuery({
    queryKey: ['tree'],
    queryFn: async () => {
      try {
        const data = await fetchTree();
        // 개발 환경에서만 빈 결과 시 목데이터로 fallback
        if (useMock && (!data || data.length === 0)) {
          return MOCK_TREE;
        }
        return data ?? [];
      } catch (err) {
        // 개발 환경에서만 API 실패 시 목데이터로 fallback
        if (useMock) return MOCK_TREE;
        throw err;
      }
    },
  });
}
