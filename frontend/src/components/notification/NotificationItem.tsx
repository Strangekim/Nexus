// 개별 알림 항목 — 타입별 아이콘, 미읽음 도트, 상대 시간, 클릭 이벤트

'use client';

import { Lock, Unlock, CheckCircle, AtSign } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Notification, NotificationType } from '@/types/realtime';

/** 알림 타입별 아이콘 매핑 */
const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  lock_request: <Lock className="size-4 text-amber-500" />,
  lock_released: <Unlock className="size-4 text-green-500" />,
  task_complete: <CheckCircle className="size-4 text-[#2D7D7B]" />,
  mention: <AtSign className="size-4 text-blue-500" />,
};

/** 상대적 시간 표시 (예: 5분 전) */
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

/** 알림 항목 컴포넌트 */
export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();
  const { id, type, payload, isRead, createdAt } = notification;
  // payload.message가 있으면 사용, 없으면 타입 기본값 표시
  const message = (payload?.message as string | undefined) ?? type.replace(/_/g, ' ');

  /** 클릭 시 읽음 처리 + 해당 세션으로 이동 */
  const handleClick = () => {
    if (!isRead) onRead(id);
    onClose();
    // payload에 sessionId가 있으면 해당 세션 페이지로 이동
    const sessionId = payload?.sessionId as string | undefined;
    if (sessionId) {
      const projectId = payload?.projectId as string | undefined;
      if (projectId) {
        router.push(`/projects/${projectId}/sessions/${sessionId}`);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F5F5EF]"
    >
      {/* 미읽음 도트 */}
      <div className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
        {!isRead && (
          <span className="size-2 rounded-full bg-[#2D7D7B]" />
        )}
      </div>

      {/* 타입 아이콘 */}
      <div className="mt-0.5 shrink-0">
        {TYPE_ICON[type] ?? <CheckCircle className="size-4 text-[#6B6B7B]" />}
      </div>

      {/* 메시지 + 시간 */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${isRead ? 'text-[#6B6B7B]' : 'font-medium text-[#1A1A1A]'}`}>
          {message}
        </p>
        <p className="mt-0.5 text-xs text-[#6B6B7B]">
          {formatRelativeTime(createdAt)}
        </p>
      </div>
    </button>
  );
}
