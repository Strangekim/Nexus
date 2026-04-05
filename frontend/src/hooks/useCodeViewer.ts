'use client';
// 코드 에디터 상태 관리 훅 — 멀티 탭 파일 열기/닫기/저장 지원

import { useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';

/** 열린 파일 하나의 상태 */
export interface OpenFile {
  path: string;
  content: string;
  language: string;
  originalContent: string;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  /** 서버에서 받은 파일 mtime — 저장 시 충돌 감지용 */
  mtime?: number;
}

interface CodeViewerState {
  isOpen: boolean;
  files: OpenFile[];
  activeIndex: number;
}

/** 파일 확장자로 Monaco 언어 ID 추론 */
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    mjs: 'javascript', cjs: 'javascript',
    py: 'python', rs: 'rust', go: 'go',
    java: 'java', cpp: 'cpp', c: 'c',
    cs: 'csharp', rb: 'ruby', php: 'php',
    css: 'css', scss: 'scss', less: 'less',
    json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', sh: 'shell', bash: 'shell',
    html: 'html', xml: 'xml', sql: 'sql',
    prisma: 'prisma', dockerfile: 'dockerfile',
    toml: 'toml', graphql: 'graphql',
    vue: 'html', svelte: 'html',
    env: 'plaintext', txt: 'plaintext', log: 'plaintext',
  };
  return map[ext ?? ''] ?? 'plaintext';
}

export function useCodeViewer() {
  const [state, setState] = useState<CodeViewerState>({
    isOpen: false,
    files: [],
    activeIndex: -1,
  });

  // 저장 중 상태 추적 (UI 피드백용)
  const [isSaving, setIsSaving] = useState(false);

  // 마지막 사용한 projectId 기억 (저장 시 활용)
  const projectIdRef = useRef<string>('');

  /** 파일 열기 — 이미 열려있으면 해당 탭 활성화, 아니면 새 탭 추가 */
  const openFile = useCallback(async (path: string, projectId: string) => {
    projectIdRef.current = projectId;

    setState((prev) => {
      // 이미 열려있는 파일인지 확인
      const existingIdx = prev.files.findIndex((f) => f.path === path);
      if (existingIdx >= 0) {
        return { ...prev, isOpen: true, activeIndex: existingIdx };
      }

      // 새 파일 탭 추가 (로딩 상태로)
      const newFile: OpenFile = {
        path,
        content: '',
        language: detectLanguage(path),
        originalContent: '',
        isDirty: false,
        isLoading: true,
        error: null,
      };
      const newFiles = [...prev.files, newFile];
      return { isOpen: true, files: newFiles, activeIndex: newFiles.length - 1 };
    });

    // API에서 파일 내용 로드
    try {
      const data = await apiFetch<{ content: string; language?: string; mtime?: number }>(
        `/api/tree/file?path=${encodeURIComponent(path)}&projectId=${projectId}`,
      );
      setState((prev) => {
        const idx = prev.files.findIndex((f) => f.path === path);
        if (idx < 0) return prev;
        const updated = [...prev.files];
        updated[idx] = {
          ...updated[idx],
          content: data.content,
          originalContent: data.content,
          language: data.language ?? detectLanguage(path),
          mtime: data.mtime,
          isLoading: false,
        };
        return { ...prev, files: updated };
      });
    } catch (err) {
      console.error('[useCodeViewer] 파일 로드 실패:', err);
      setState((prev) => {
        const idx = prev.files.findIndex((f) => f.path === path);
        if (idx < 0) return prev;
        const updated = [...prev.files];
        updated[idx] = {
          ...updated[idx],
          isLoading: false,
          error: '파일을 불러오는 데 실패했습니다.',
        };
        return { ...prev, files: updated };
      });
    }
  }, []);

  /** 탭 닫기 — 더티 상태 무시 (호출 전 확인 필요) */
  const closeFile = useCallback((path: string) => {
    setState((prev) => {
      const idx = prev.files.findIndex((f) => f.path === path);
      if (idx < 0) return prev;

      const newFiles = prev.files.filter((_, i) => i !== idx);
      let newActive = prev.activeIndex;

      // 활성 탭이 닫힌 경우 또는 뒤의 탭이 닫힌 경우 인덱스 조정
      if (newFiles.length === 0) {
        return { isOpen: false, files: [], activeIndex: -1 };
      }
      if (idx === prev.activeIndex) {
        newActive = Math.min(idx, newFiles.length - 1);
      } else if (idx < prev.activeIndex) {
        newActive = prev.activeIndex - 1;
      }

      return { ...prev, files: newFiles, activeIndex: newActive };
    });
  }, []);

  /** 활성 탭 변경 */
  const setActiveFile = useCallback((path: string) => {
    setState((prev) => {
      const idx = prev.files.findIndex((f) => f.path === path);
      if (idx < 0) return prev;
      return { ...prev, activeIndex: idx };
    });
  }, []);

  /** 파일 내용 변경 — 더티 플래그 업데이트 */
  const updateContent = useCallback((path: string, newContent: string) => {
    setState((prev) => {
      const idx = prev.files.findIndex((f) => f.path === path);
      if (idx < 0) return prev;
      const file = prev.files[idx];
      const updated = [...prev.files];
      updated[idx] = {
        ...file,
        content: newContent,
        isDirty: newContent !== file.originalContent,
      };
      return { ...prev, files: updated };
    });
  }, []);

  /** 파일 저장 — PUT /api/tree/file 호출 */
  const saveFile = useCallback(async (path: string, projectId?: string) => {
    const pid = projectId ?? projectIdRef.current;
    if (!pid) return;

    setIsSaving(true);
    try {
      const file = state.files.find((f) => f.path === path);
      if (!file || !file.isDirty) {
        setIsSaving(false);
        return;
      }

      const response = await apiFetch<{ mtime?: number }>('/api/tree/file', {
        method: 'PUT',
        body: JSON.stringify({
          path,
          content: file.content,
          projectId: pid,
          expectedMtime: file.mtime,
        }),
      });

      // 저장 성공 — originalContent + mtime 갱신, 더티 해제
      setState((prev) => {
        const idx = prev.files.findIndex((f) => f.path === path);
        if (idx < 0) return prev;
        const updated = [...prev.files];
        updated[idx] = {
          ...updated[idx],
          originalContent: updated[idx].content,
          mtime: response.mtime,
          isDirty: false,
        };
        return { ...prev, files: updated };
      });
    } catch (err) {
      console.error('[useCodeViewer] 파일 저장 실패:', err);
      // 409 CONFLICT인 경우 에러 표시 — 사용자에게 재로드 안내
      const error = err as { status?: number; body?: { error?: { code?: string } } };
      if (error.status === 409 || error.body?.error?.code === 'CONFLICT') {
        setState((prev) => {
          const idx = prev.files.findIndex((f) => f.path === path);
          if (idx < 0) return prev;
          const updated = [...prev.files];
          updated[idx] = {
            ...updated[idx],
            error: '파일이 외부에서 수정되었습니다. 탭을 닫고 다시 열어주세요.',
          };
          return { ...prev, files: updated };
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [state.files]);

  /** 파일 없이 패널만 열기 — 탐색기에서 파일 선택 전 상태 */
  const openPanel = useCallback((projectId: string) => {
    projectIdRef.current = projectId;
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  /** 전체 패널 닫기 — 열린 파일은 유지, 패널만 숨김 */
  const closePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  /** 모든 탭 닫기 */
  const closeAll = useCallback(() => {
    setState({ isOpen: false, files: [], activeIndex: -1 });
  }, []);

  // 현재 활성 파일
  const activeFile = state.activeIndex >= 0 ? state.files[state.activeIndex] ?? null : null;

  return {
    isOpen: state.isOpen,
    files: state.files,
    activeIndex: state.activeIndex,
    activeFile,
    isSaving,
    projectId: projectIdRef.current,
    openFile,
    openPanel,
    closeFile,
    setActiveFile,
    updateContent,
    saveFile,
    closePanel,
    closeAll,
  };
}
