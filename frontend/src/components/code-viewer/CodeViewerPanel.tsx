'use client';
// 코드 에디터 패널 — Monaco 기반 멀티 탭 에디터, 오른쪽 슬라이드 패널

import { useCallback, useEffect, useRef } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import type { OpenFile } from '@/hooks/useCodeViewer';
import { EditorTabBar } from './EditorTabBar';
import { MonacoEditorWrapper } from './MonacoEditorWrapper';

interface CodeViewerPanelProps {
  isOpen: boolean;
  files: OpenFile[];
  activeIndex: number;
  activeFile: OpenFile | null;
  isSaving: boolean;
  onClosePanel: () => void;
  onCloseFile: (path: string) => void;
  onSetActiveFile: (path: string) => void;
  onUpdateContent: (path: string, content: string) => void;
  onSaveFile: (path: string) => void;
}

export function CodeViewerPanel({
  isOpen,
  files,
  activeIndex,
  activeFile,
  isSaving,
  onClosePanel,
  onCloseFile,
  onSetActiveFile,
  onUpdateContent,
  onSaveFile,
}: CodeViewerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /** Ctrl+S 키보드 단축키 처리 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile?.isDirty) {
          onSaveFile(activeFile.path);
        }
      }
    },
    [activeFile, onSaveFile],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(26,26,46,0.4)' }}
          onClick={onClosePanel}
        />
      )}

      {/* 슬라이드 패널 */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(900px, 55vw)',
          minWidth: '40vw',
          backgroundColor: '#1E1E1E',
          borderLeft: '1px solid #333',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 헤더 — 파일 경로 + 저장/닫기 버튼 */}
        <div
          className="flex items-center gap-2 px-3 py-2 shrink-0"
          style={{ backgroundColor: '#252526', borderBottom: '1px solid #333' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
              {activeFile?.path ?? '파일 에디터'}
            </p>
          </div>

          {/* 저장 버튼 */}
          {activeFile?.isDirty && (
            <button
              onClick={() => onSaveFile(activeFile.path)}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
              style={{
                backgroundColor: '#2D7D7B',
                color: '#fff',
                opacity: isSaving ? 0.6 : 1,
              }}
              title="저장 (Ctrl+S)"
            >
              {isSaving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              <span>저장</span>
            </button>
          )}

          {/* 패널 닫기 */}
          <button
            onClick={onClosePanel}
            className="p-1 rounded transition-colors"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3C3C3C')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="패널 닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 탭 바 */}
        {files.length > 0 && (
          <EditorTabBar
            files={files}
            activeIndex={activeIndex}
            onSetActiveFile={onSetActiveFile}
            onCloseFile={onCloseFile}
          />
        )}

        {/* 에디터 본문 */}
        <div className="flex-1 overflow-hidden">
          {activeFile?.isLoading && (
            <div className="flex items-center justify-center h-full gap-2" style={{ color: '#9CA3AF' }}>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          )}

          {activeFile?.error && !activeFile.isLoading && (
            <div className="p-4">
              <p className="text-sm" style={{ color: '#E0845E' }}>{activeFile.error}</p>
            </div>
          )}

          {activeFile && !activeFile.isLoading && !activeFile.error && (
            <MonacoEditorWrapper
              path={activeFile.path}
              content={activeFile.content}
              language={activeFile.language}
              onChange={(value) => onUpdateContent(activeFile.path, value)}
            />
          )}

          {!activeFile && files.length === 0 && (
            <div className="flex items-center justify-center h-full" style={{ color: '#6B7280' }}>
              <p className="text-sm">열린 파일이 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
