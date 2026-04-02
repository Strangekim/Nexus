// 사이드바 헤더 알림 벨 아이콘 — 미읽음 뱃지 + 드롭다운 토글

'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { NotificationDropdown } from './NotificationDropdown';

/** 알림 벨 컴포넌트 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unreadCount = useRealtimeStore((s) => s.unreadCount);

  /** 드롭다운 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* 벨 버튼 */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-[#6B6B7B] hover:text-[#1A1A1A]"
        aria-label="알림"
      >
        <Bell className="size-4" />

        {/* 미읽음 카운트 뱃지 */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* 드롭다운 패널 */}
      {open && <NotificationDropdown onClose={() => setOpen(false)} />}
    </div>
  );
}
