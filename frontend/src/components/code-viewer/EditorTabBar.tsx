'use client';
// 에디터 탭 바 — 열린 파일 탭 목록 표시, 활성 탭 강조, 닫기/전환 지원

import { X } from 'lucide-react';
import type { OpenFile } from '@/hooks/useCodeViewer';

interface EditorTabBarProps {
  files: OpenFile[];
  activeIndex: number;
  onSetActiveFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

/** 파일 경로에서 파일명만 추출 */
function getFileName(path: string): string {
  return path.split('/').pop() ?? path;
}

export function EditorTabBar({
  files,
  activeIndex,
  onSetActiveFile,
  onCloseFile,
}: EditorTabBarProps) {
  return (
    <div
      className="flex items-center shrink-0 overflow-x-auto"
      style={{
        backgroundColor: '#252526',
        borderBottom: '1px solid #333',
        scrollbarWidth: 'thin',
      }}
    >
      {files.map((file, idx) => {
        const isActive = idx === activeIndex;
        return (
          <div
            key={file.path}
            className="flex items-center gap-1 px-3 py-1.5 cursor-pointer shrink-0 group"
            style={{
              backgroundColor: isActive ? '#1E1E1E' : 'transparent',
              borderBottom: isActive ? '2px solid #2D7D7B' : '2px solid transparent',
              borderRight: '1px solid #333',
              maxWidth: '200px',
            }}
            onClick={() => onSetActiveFile(file.path)}
            title={file.path}
          >
            {/* 더티 표시 점 또는 파일명 */}
            <span
              className="text-xs truncate select-none"
              style={{ color: isActive ? '#D4D4D4' : '#9CA3AF' }}
            >
              {getFileName(file.path)}
            </span>

            {/* 수정됨 표시 (점) */}
            {file.isDirty && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: '#E0845E' }}
                title="저장되지 않은 변경사항"
              />
            )}

            {/* 닫기 버튼 — 호버 시 표시 */}
            <button
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ color: '#9CA3AF' }}
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.path);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3C3C3C')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              aria-label={`${getFileName(file.path)} 탭 닫기`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
