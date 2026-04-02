// 알림 드롭다운 패널 — 알림 목록, 모두 읽음 버튼, 빈 상태 처리

'use client';

import { Bell } from 'lucide-react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

/** 표시할 최대 알림 수 */
const MAX_DISPLAY = 10;

interface NotificationDropdownProps {
  onClose: () => void;
}

/** 알림 드롭다운 패널 */
export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications: storeNotifs } = useRealtimeStore();
  const { notifications: serverNotifs, markAsRead, markAllAsRead } = useNotifications();

  // 스토어 알림을 우선 표시하고, 서버 알림으로 보완 (최근 10개)
  const allNotifs = storeNotifs.length > 0 ? storeNotifs : serverNotifs;
  const displayNotifs = allNotifs.slice(0, MAX_DISPLAY);
  const unreadCount = allNotifs.filter((n) => !n.isRead).length;

  return (
    <div
      className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-lg border border-[#E8E5DE] bg-white shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더: 제목 + 모두 읽음 버튼 */}
      <div className="flex items-center justify-between border-b border-[#E8E5DE] px-3 py-2.5">
        <span className="text-sm font-semibold text-[#1A1A1A]">알림</span>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="text-xs text-[#2D7D7B] transition-colors hover:text-[#1A1A1A]"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      <div className="max-h-80 overflow-y-auto">
        {displayNotifs.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bell className="size-8 text-[#E8E5DE]" />
            <p className="text-sm text-[#6B6B7B]">새 알림이 없습니다</p>
          </div>
        ) : (
          displayNotifs.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onRead={markAsRead}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* 알림이 많을 때 더보기 힌트 */}
      {allNotifs.length > MAX_DISPLAY && (
        <div className="border-t border-[#E8E5DE] px-3 py-2 text-center">
          <span className="text-xs text-[#6B6B7B]">
            총 {allNotifs.length}개 중 최근 {MAX_DISPLAY}개
          </span>
        </div>
      )}
    </div>
  );
}
