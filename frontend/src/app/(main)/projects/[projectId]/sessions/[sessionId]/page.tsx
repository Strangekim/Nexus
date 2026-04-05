// 세션 채팅 페이지 — ChatPanel + 터미널 + 코드 뷰어 통합 레이아웃

import { SessionLayout } from '@/components/chat/SessionLayout';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = await params;
  // key로 세션 전환 시 컴포넌트 리마운트 강제 — 이전 세션 상태 잔존 방지
  return <SessionLayout key={sessionId} sessionId={sessionId} projectId={projectId} />;
}
