// 알림 드롭다운 패널 — fixed 포지셔닝, 알림 목록, 모두 읽음 버튼, 빈 상태 처리

'use client';

import { useState, forwardRef } from 'react';
import { Bell, Settings } from 'lucide-react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { NotificationSettings } from './NotificationSettings';
import { ClaudeAuthSettings } from '@/components/settings/ClaudeAuthSettings';

/** 설정 패널 탭 타입 */
type SettingsTab = 'notification' | 'claude';

/** 표시할 최대 알림 수 */
const MAX_DISPLAY = 10;

interface NotificationDropdownProps {
  onClose: () => void;
  /** 뷰포트 기준 절대 좌표 (NotificationBell에서 계산 후 전달) */
  position: { top: number; left: number };
}

/** 알림 드롭다운 패널 — 뷰포트 기준 fixed 배치로 사이드바 클리핑 방지 */
export const NotificationDropdown = forwardRef<HTMLDivElement, NotificationDropdownProps>(
function NotificationDropdownInner({ onClose, position }, ref) {
  const [showSettings, setShowSettings] = useState(false);
  // 설정 패널 내 탭 상태 — 알림 설정 | Claude 연동
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('notification');
  const { notifications: storeNotifs } = useRealtimeStore();
  const { notifications: serverNotifs, markAsRead, markAllAsRead } = useNotifications();

  // 스토어 알림을 우선 표시하고, 서버 알림으로 보완 (최근 10개)
  const allNotifs = storeNotifs.length > 0 ? storeNotifs : serverNotifs;
  const displayNotifs = allNotifs.slice(0, MAX_DISPLAY);
  const unreadCount = allNotifs.filter((n) => !n.isRead).length;

  return (
    // fixed 포지셔닝으로 사이드바 경계 외부로도 자유롭게 표시
    <div
      ref={ref}
      className="fixed z-[200] w-80 overflow-hidden rounded-lg border border-[#E8E5DE] bg-white shadow-xl"
      style={{
        top: position.top,
        left: position.left,
        // 뷰포트 하단 초과 방지: 드롭다운 최대 높이를 뷰포트 기준으로 제한
        maxHeight: `calc(100vh - ${position.top + 16}px)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더: 제목 + 설정 버튼 + 모두 읽음 버튼 */}
      <div className="flex items-center justify-between border-b border-[#E8E5DE] px-3 py-2.5">
        <span className="text-sm font-semibold text-[#1A1A1A]">알림</span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-[#2D7D7B] transition-colors hover:text-[#1A1A1A]"
            >
              모두 읽음
            </button>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="text-[#6B6B7B] transition-colors hover:text-[#1A1A1A]"
            aria-label="알림 설정"
          >
            <Settings className="size-3.5" />
          </button>
        </div>
      </div>

      {/* 알림 목록 — 드롭다운 높이 내에서 스크롤 */}
      <div className="max-h-72 overflow-y-auto">
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

      {/* 설정 패널 — 알림 설정 / Claude 연동 탭 */}
      {showSettings && (
        <div className="border-t border-[#E8E5DE]">
          {/* 탭 헤더 */}
          <div className="flex border-b border-[#E8E5DE]">
            <button
              onClick={() => setSettingsTab('notification')}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                color: settingsTab === 'notification' ? '#2D7D7B' : '#6B6B7B',
                borderBottom: settingsTab === 'notification' ? '2px solid #2D7D7B' : '2px solid transparent',
              }}
            >
              알림
            </button>
            <button
              onClick={() => setSettingsTab('claude')}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                color: settingsTab === 'claude' ? '#2D7D7B' : '#6B6B7B',
                borderBottom: settingsTab === 'claude' ? '2px solid #2D7D7B' : '2px solid transparent',
              }}
            >
              Claude 연동
            </button>
          </div>
          {/* 탭 컨텐츠 */}
          {settingsTab === 'notification' ? <NotificationSettings /> : <ClaudeAuthSettings />}
        </div>
      )}
    </div>
  );
});
