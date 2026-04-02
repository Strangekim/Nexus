'use client';
// 세션 생성자 안내 배너 — 타인이 시작한 세션에서만 표시

import { Users } from 'lucide-react';

interface SessionCreatorBannerProps {
  /** 세션 생성자 정보 */
  creator: { id: string; name: string } | null | undefined;
  /** 현재 로그인한 사용자 ID */
  currentUserId: string | undefined;
}

/**
 * 본인이 아닌 타인이 시작한 세션에 진입했을 때 배너를 표시한다.
 * claudeSessionId가 있으면 --resume으로 자동 이어가므로 컨텍스트가 유지됨을 안내.
 */
export function SessionCreatorBanner({ creator, currentUserId }: SessionCreatorBannerProps) {
  // 생성자가 없거나 본인이 시작한 세션이면 렌더링 안 함
  if (!creator || creator.id === currentUserId) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'rgba(45, 125, 123, 0.12)',
        borderBottom: '1px solid rgba(45, 125, 123, 0.25)',
        color: '#5AADAB',
      }}
    >
      <Users size={14} className="shrink-0" />
      <span>
        <span className="font-medium">{creator.name}</span>
        {' '}님이 시작한 세션입니다. 락 획득 후 이어서 작업할 수 있습니다.
      </span>
    </div>
  );
}
