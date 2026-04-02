'use client';
// 코드 뷰어 패널 — 오른쪽에서 슬라이드 인하는 패널, 구문 강조 표시

import { X, FileCode, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerPanelProps {
  isOpen: boolean;
  filePath: string | null;
  content: string | null;
  language: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function CodeViewerPanel({
  isOpen,
  filePath,
  content,
  language,
  isLoading,
  error,
  onClose,
}: CodeViewerPanelProps) {
  /** 파일명만 추출 */
  const fileName = filePath?.split('/').pop() ?? '';

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(26,26,46,0.25)' }}
          onClick={onClose}
        />
      )}

      {/* 슬라이드 패널 */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(600px, 50vw)',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E8E5DE',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid #E8E5DE', backgroundColor: '#F5F5EF' }}
        >
          <FileCode size={16} style={{ color: '#2D7D7B' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
              {fileName || '파일 뷰어'}
            </p>
            {filePath && (
              <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                {filePath}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: '#6B7280' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E5DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-full gap-2" style={{ color: '#6B7280' }}>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4">
              <p className="text-sm" style={{ color: '#E0845E' }}>{error}</p>
            </div>
          )}

          {content && !isLoading && (
            <SyntaxHighlighter
              language={language ?? 'text'}
              style={oneLight}
              showLineNumbers
              wrapLongLines={false}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '13px',
                lineHeight: '1.6',
                background: '#FFFFFF',
                minHeight: '100%',
              }}
              lineNumberStyle={{ color: '#9CA3AF', minWidth: '2.5em' }}
            >
              {content}
            </SyntaxHighlighter>
          )}
        </div>
      </div>
    </>
  );
}
