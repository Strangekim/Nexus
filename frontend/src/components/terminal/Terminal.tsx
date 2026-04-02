'use client';

// 터미널 래퍼 — next/dynamic으로 SSR 비활성화 + xterm 지연 로드

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

/** xterm 코어를 클라이언트에서만 로드 (SSR 비활성화) */
const XTermCore = dynamic(() => import('./XTermCore'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-white">
      <Loader2 className="size-5 animate-spin text-[#2D7D7B]" />
    </div>
  ),
});

interface TerminalProps {
  sessionId: string;
  projectId: string;
}

export function Terminal({ sessionId, projectId }: TerminalProps) {
  return <XTermCore sessionId={sessionId} projectId={projectId} />;
}
