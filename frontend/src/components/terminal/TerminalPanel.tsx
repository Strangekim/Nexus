'use client';
// 터미널 패널 — 드래그로 높이 조절 가능한 하단 패널 + 멀티탭 지원

import { useRef, useCallback, useEffect, useState } from 'react';
import { X, Minus } from 'lucide-react';
import { Terminal } from './Terminal';
import { TerminalTabBar, type TerminalTab } from './TerminalTabBar';

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
/** 최대 동시 터미널 탭 수 — 백엔드 MAX_USER_SESSIONS와 일치해야 함 */
const MAX_TABS = 4;

/** 탭 ID 생성 — 고유 식별자 */
function genTabId(): string {
  return `term-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  // 탭 상태 — 패널 최초 오픈 시 첫 탭 자동 생성
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // 패널이 열리면 탭이 하나도 없을 때 자동 생성
  useEffect(() => {
    if (isOpen && tabs.length === 0) {
      const firstTab: TerminalTab = { id: genTabId(), label: '터미널 1' };
      setTabs([firstTab]);
      setActiveTabId(firstTab.id);
    }
  }, [isOpen, tabs.length]);

  /** 새 탭 추가 */
  const handleNewTab = useCallback(() => {
    setTabs((prev) => {
      if (prev.length >= MAX_TABS) return prev;
      const nextNum = prev.length + 1;
      const newTab: TerminalTab = { id: genTabId(), label: `터미널 ${nextNum}` };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  /** 탭 닫기 */
  const handleCloseTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const newTabs = prev.filter((t) => t.id !== id);
      // 활성 탭이 닫힌 경우 인접 탭으로 이동
      if (id === activeTabId && newTabs.length > 0) {
        const nextActive = newTabs[Math.min(idx, newTabs.length - 1)];
        setActiveTabId(nextActive.id);
      }
      return newTabs;
    });
  }, [activeTabId]);

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
        transition: isDragging ? 'none' : 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderTop: isOpen ? '1px solid #333' : 'none',
        backgroundColor: '#282A36',
      }}
    >
      {/* 드래그 핸들 + 헤더 */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-3 shrink-0 select-none"
        style={{
          height: '28px',
          cursor: 'row-resize',
          backgroundColor: '#1A1A2E',
          borderBottom: '1px solid #333',
          userSelect: 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <Minus size={12} style={{ color: '#9CA3AF' }} />
          <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
            터미널
          </span>
        </div>

        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="p-1 rounded transition-colors"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3C3C3C')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="터미널 닫기"
        >
          <X size={14} />
        </button>
      </div>

      {/* 탭 바 */}
      {isOpen && tabs.length > 0 && (
        <TerminalTabBar
          tabs={tabs}
          activeId={activeTabId}
          onSelect={setActiveTabId}
          onClose={handleCloseTab}
          onNew={handleNewTab}
          maxTabs={MAX_TABS}
        />
      )}

      {/* 터미널 영역 — 각 탭의 인스턴스를 유지하되 활성 탭만 표시 */}
      {isOpen && (
        <div className="flex-1 relative overflow-hidden">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="absolute inset-0"
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            >
              <Terminal sessionId={`${sessionId}:${tab.id}`} projectId={projectId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
