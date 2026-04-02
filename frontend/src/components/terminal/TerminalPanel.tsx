'use client';
// 터미널 패널 — 드래그로 높이 조절 가능한 하단 패널

import { useRef, useCallback, useEffect, useState } from 'react';
import { X, Minus } from 'lucide-react';
import { Terminal } from './Terminal';

interface TerminalPanelProps {
  isOpen: boolean;
  height: number;
  onHeightChange: (h: number) => void;
  onClose: () => void;
  sessionId: string;
  projectId: string;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 600;

export function TerminalPanel({
  isOpen,
  height,
  onHeightChange,
  onClose,
  sessionId,
  projectId,
}: TerminalPanelProps) {
  // 드래그 활성 여부 — 트랜지션 비활성화에 사용
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  /** 드래그 시작 — mousedown 이벤트 */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startH: height };
      setIsDragging(true);
    },
    [height],
  );

  /** 드래그 중 — mousemove로 높이 계산 */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragRef.current.startH + delta));
      onHeightChange(newH);
    };

    const onMouseUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onHeightChange]);

  return (
    <div
      className="shrink-0 flex flex-col overflow-hidden"
      style={{
        height: isOpen ? `${height}px` : '0px',
        // 드래그 중에는 트랜지션 비활성화 (성능 최적화)
        transition: isDragging ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderTop: isOpen ? '1px solid #E8E5DE' : 'none',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* 드래그 핸들 + 헤더 */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-3 shrink-0 select-none"
        style={{
          height: '32px',
          cursor: 'row-resize',
          backgroundColor: '#F5F5EF',
          borderBottom: '1px solid #E8E5DE',
          userSelect: 'none',
        }}
      >
        {/* 드래그 핸들 시각화 */}
        <div className="flex items-center gap-2">
          <Minus size={12} style={{ color: '#9CA3AF' }} />
          <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
            터미널
          </span>
        </div>

        {/* 닫기 버튼 */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E5DE')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="터미널 닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* xterm.js 터미널 영역 */}
      {isOpen && (
        <div className="flex-1 overflow-hidden">
          <Terminal sessionId={sessionId} projectId={projectId} />
        </div>
      )}
    </div>
  );
}
