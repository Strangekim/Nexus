'use client';
// 코드 뷰어 상태 관리 훅 — 파일 열기/닫기 및 내용 로드

import { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface CodeViewerState {
  isOpen: boolean;
  filePath: string | null;
  content: string | null;
  language: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseCodeViewerReturn extends CodeViewerState {
  openFile: (path: string, projectId: string) => Promise<void>;
  closeFile: () => void;
}

/** 파일 확장자로 언어 추론 */
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go',
    java: 'java', cpp: 'cpp', c: 'c',
    css: 'css', scss: 'scss',
    json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sh: 'bash', bash: 'bash',
    html: 'html', xml: 'xml', sql: 'sql',
    prisma: 'prisma', env: 'bash',
  };
  return map[ext ?? ''] ?? 'text';
}

export function useCodeViewer(): UseCodeViewerReturn {
  const [state, setState] = useState<CodeViewerState>({
    isOpen: false,
    filePath: null,
    content: null,
    language: null,
    isLoading: false,
    error: null,
  });

  /** 파일 열기 — API 호출 후 패널 표시 */
  const openFile = useCallback(async (path: string, projectId: string) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      filePath: path,
      isLoading: true,
      error: null,
    }));

    try {
      const data = await apiFetch<{ content: string }>(
        `/api/tree/file?path=${encodeURIComponent(path)}&projectId=${projectId}`,
      );
      setState((prev) => ({
        ...prev,
        content: data.content,
        language: detectLanguage(path),
        isLoading: false,
      }));
    } catch (err) {
      // 파일 로드 실패 — 에러 상태로 전환하여 UI에 메시지 표시
      console.error('[useCodeViewer] 파일 로드 실패:', err);
      setState((prev) => ({
        ...prev,
        content: null,
        isLoading: false,
        error: '파일을 불러오는 데 실패했습니다.',
      }));
    }
  }, []);

  /** 파일 닫기 */
  const closeFile = useCallback(() => {
    setState({
      isOpen: false,
      filePath: null,
      content: null,
      language: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return { ...state, openFile, closeFile };
}
