'use client';
// 터미널 토글 바 — 채팅 하단에 항상 표시되는 얇은 바

import { Terminal } from 'lucide-react';

interface TerminalToggleBarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function TerminalToggleBar({ isOpen, onToggle }: TerminalToggleBarProps) {
  return (
    <div
      className="flex items-center shrink-0"
      style={{
        height: '32px',
        borderTop: '1px solid #E8E5DE',
        backgroundColor: '#F5F5EF',
        paddingLeft: '12px',
        gap: '6px',
      }}
    >
      {/* 터미널 토글 버튼 */}
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all"
        style={{
          color: isOpen ? '#2D7D7B' : '#6B7280',
          backgroundColor: isOpen ? 'rgba(45,125,123,0.1)' : 'transparent',
          border: isOpen ? '1px solid rgba(45,125,123,0.3)' : '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = '#E8E5DE';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="터미널 토글"
        aria-expanded={isOpen}
      >
        <Terminal size={13} />
        <span>&gt;_ 터미널</span>
      </button>
    </div>
  );
}
