// 개별 알림 항목 — 타입별 아이콘, 메시지, 미읽음 도트, 상대 시간

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

/** 상대적 시간 표시 */
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

/** 알림 타입 + payload에서 사람이 읽을 수 있는 메시지 생성 */
function buildMessage(type: NotificationType, payload: Record<string, unknown> | null): string {
  const p = payload ?? {};
  const requester = p.requesterName as string | undefined;
  const session = p.sessionTitle as string | undefined;
  const project = p.projectName as string | undefined;

  switch (type) {
    case 'lock_request':
      return requester && session
        ? `${requester}님이 "${session}" 세션의 작업 권한을 요청했습니다`
        : '작업 권한 요청이 있습니다';
    case 'lock_released':
      return session
        ? `"${session}" 세션의 잠금이 해제되었습니다`
        : '세션 잠금이 해제되었습니다';
    case 'task_complete':
      return session && project
        ? `"${session}" 작업이 완료되었습니다 (${project})`
        : '작업이 완료되었습니다';
    case 'mention':
      return requester
        ? `${requester}님이 회원님을 멘션했습니다`
        : '멘션 알림';
    default:
      return (p.message as string | undefined) ?? (type as string).replace(/_/g, ' ');
  }
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const router = useRouter();
  const { id, type, payload, isRead, createdAt } = notification;
  const message = buildMessage(type, payload);

  const handleClick = () => {
    if (!isRead) onRead(id);
    onClose();
    const sessionId = payload?.sessionId as string | undefined;
    const projectId = payload?.projectId as string | undefined;
    if (sessionId && projectId) {
      router.push(`/projects/${projectId}/sessions/${sessionId}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#F5F5EF]"
    >
      {/* 미읽음 도트 */}
      <div className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
        {!isRead && <span className="size-2 rounded-full bg-[#2D7D7B]" />}
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
        <p className="mt-0.5 text-xs text-[#6B6B7B]">{formatRelativeTime(createdAt)}</p>
      </div>
    </button>
  );
}
