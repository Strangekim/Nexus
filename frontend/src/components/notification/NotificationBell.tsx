// 사이드바 헤더 알림 벨 아이콘 — 미읽음 뱃지 + 드롭다운 토글

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { NotificationDropdown } from './NotificationDropdown';

/** 드롭다운 위치 정보 */
interface DropdownPosition {
  top: number;
  left: number;
}

/** 알림 벨 컴포넌트 — fixed 포지셔닝으로 드롭다운을 뷰포트 기준 배치 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const unreadCount = useRealtimeStore((s) => s.unreadCount);

  /** 버튼 위치 기반으로 드롭다운 좌표 계산 */
  const calcPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 320; // w-80 = 20rem = 320px
    const gap = 6; // 버튼 아래 여백

    // 뷰포트 오른쪽 경계를 벗어나지 않도록 left 값 보정
    const rawLeft = rect.right - dropdownWidth;
    const clampedLeft = Math.max(8, rawLeft);

    setDropdownPos({
      top: rect.bottom + gap,
      left: clampedLeft,
    });
  }, []);

  /** 드롭다운 열릴 때 위치 계산 */
  const handleToggle = () => {
    if (!open) calcPosition();
    setOpen((prev) => !prev);
  };

  /** 드롭다운 외부 클릭 시 닫기 */
  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  /** 스크롤·리사이즈 시 드롭다운 위치 재계산 */
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
      {/* 벨 버튼 */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon-sm"
        onClick={handleToggle}
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

      {/* 드롭다운 패널 — 뷰포트 기준 fixed 포지셔닝 */}
      {open && (
        <NotificationDropdown
          onClose={() => setOpen(false)}
          position={dropdownPos}
        />
      )}
    </>
  );
}
