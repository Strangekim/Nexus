'use client';
// 락 요청 버튼 — 타인이 락을 보유한 세션에서만 표시

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/lib/api';
import { LockRequestDialog } from './LockRequestDialog';

interface LockRequestButtonProps {
  sessionId: string;
}

export function LockRequestButton({ sessionId }: LockRequestButtonProps) {
  const lock = useRealtimeStore((s) => s.sessionLocks.get(sessionId));
  const currentUser = useAuthStore((s) => s.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sent, setSent] = useState(false);

  // 락이 없거나 본인 락이면 렌더링 안 함
  const isOtherLock = lock && currentUser && lock.userId !== currentUser.id;
  if (!isOtherLock) return null;

  /** 락 요청 API 호출 */
  const handleRequest = async (message: string) => {
    await apiFetch(`/api/sessions/${sessionId}/lock-request`, {
      method: 'POST',
      body: JSON.stringify({ message: message || undefined }),
    });
    setSent(true);
    // 5초 후 재요청 가능하도록 초기화
    setTimeout(() => setSent(false), 5_000);
  };

  if (sent) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{ backgroundColor: '#F0EFEB', color: '#6B6B7B', border: '1px solid #E8E5DE' }}
      >
        요청 전송됨
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#E0845E', color: '#fff' }}
      >
        <BellRing size={13} />
        작업 요청
      </button>

      <LockRequestDialog
        open={dialogOpen}
        lockerName={lock.userName}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleRequest}
      />
    </>
  );
}
