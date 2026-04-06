'use client';
// 세션 락 상태 뱃지 — 본인/타인/미잠금 상태를 색상으로 구분 표시

import { Lock, Unlock, User } from 'lucide-react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthStore } from '@/stores/authStore';

interface LockStatusBadgeProps {
  sessionId: string;
}

/** ISO 8601 → 상대적 시간 문자열 변환 */
function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${Math.floor(diffHr / 24)}일 전`;
}

export function LockStatusBadge({ sessionId }: LockStatusBadgeProps) {
  const lock = useRealtimeStore((s) => s.sessionLocks.get(sessionId));
  const currentUser = useAuthStore((s) => s.user);

  // 미잠금 상태
  if (!lock) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#F0EFEB', color: '#6B6B7B', border: '1px solid #E8E5DE' }}
      >
        <Unlock size={11} />
        미사용
      </span>
    );
  }

  // 본인 락 — 다른 기기에서도 접근 가능함을 명시
  const isOwner = currentUser?.id === lock.userId;
  if (isOwner) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}
        title={`내가 작업 중 (${new Date(lock.lockedAt).toLocaleString()}부터)`}
      >
        <Lock size={11} />
        내 작업 · {formatRelativeTime(lock.lockedAt)}
      </span>
    );
  }

  // 타인 락
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
      title={`락 획득: ${new Date(lock.lockedAt).toLocaleString()}`}
    >
      <User size={11} />
      {lock.userName}이 작업 중 · {formatRelativeTime(lock.lockedAt)}
    </span>
  );
}
