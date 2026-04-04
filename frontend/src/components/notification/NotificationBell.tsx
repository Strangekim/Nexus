// 사이드바 헤더 알림 벨 아이콘 — 미읽음 뱃지 + 드롭다운 토글

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationDropdown } from './NotificationDropdown';

interface DropdownPosition {
  top: number;
  left: number;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadCount = useRealtimeStore((s) => s.unreadCount);

  // 벨 마운트 시 알림 목록을 서버에서 가져와 store 초기화
  useNotifications();

  const calcPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 320;
    const gap = 6;
    const rawLeft = rect.right - dropdownWidth;
    setDropdownPos({
      top: rect.bottom + gap,
      left: Math.max(8, rawLeft),
    });
  }, []);

  const handleToggle = () => {
    if (!open) calcPosition();
    setOpen((prev) => !prev);
  };

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  // 스크롤·리사이즈 시 위치 재계산
  useEffect(() => {
    if (!open) return;
    const handleReposition = () => calcPosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, calcPosition]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
        className="relative text-[#6B6B7B] hover:text-[#1A1A1A]"
        aria-label="알림"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <NotificationDropdown
          ref={dropdownRef}
          onClose={() => setOpen(false)}
          position={dropdownPos}
        />
      )}
    </>
  );
}
