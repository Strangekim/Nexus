'use client';
// 터미널 탭 바 — 여러 터미널 세션 관리, 활성 탭 강조, 새 탭/닫기 지원

import { X, Plus, Terminal as TerminalIcon } from 'lucide-react';

export interface TerminalTab {
  id: string;
  label: string;
}

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  maxTabs: number;
}

export function TerminalTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  maxTabs,
}: TerminalTabBarProps) {
  const canAddNew = tabs.length < maxTabs;

  return (
    <div
      className="flex items-center shrink-0 overflow-x-auto"
      style={{
        backgroundColor: '#1A1A2E',
        borderBottom: '1px solid #333',
        height: '32px',
        scrollbarWidth: 'thin',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className="flex items-center gap-1.5 px-3 h-full cursor-pointer group shrink-0"
            style={{
              backgroundColor: isActive ? '#282A36' : 'transparent',
              borderRight: '1px solid #333',
              borderBottom: isActive ? '2px solid #2D7D7B' : '2px solid transparent',
              maxWidth: '180px',
            }}
          >
            <TerminalIcon size={12} style={{ color: isActive ? '#F8F8F2' : '#9CA3AF' }} />
            <span
              className="text-xs truncate select-none"
              style={{ color: isActive ? '#F8F8F2' : '#9CA3AF' }}
            >
              {tab.label}
            </span>
            {tabs.length > 1 && (
              <button
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ color: '#9CA3AF' }}
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3C3C3C')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                aria-label={`${tab.label} 닫기`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {/* 새 탭 추가 버튼 */}
      <button
        onClick={onNew}
        disabled={!canAddNew}
        className="flex items-center justify-center w-8 h-full transition-colors shrink-0"
        style={{
          color: canAddNew ? '#9CA3AF' : '#4B5563',
          cursor: canAddNew ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => canAddNew && (e.currentTarget.style.backgroundColor = '#3C3C3C')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-label={canAddNew ? '새 터미널' : `최대 ${maxTabs}개까지 가능`}
        title={canAddNew ? '새 터미널 (+)' : `최대 ${maxTabs}개까지 가능`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
