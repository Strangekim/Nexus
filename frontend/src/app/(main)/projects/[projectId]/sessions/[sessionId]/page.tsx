// 세션 채팅 페이지 — ChatPanel + 터미널 + 코드 뷰어 통합 레이아웃

import { SessionLayout } from '@/components/chat/SessionLayout';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId, sessionId } = await params;
  return <SessionLayout sessionId={sessionId} projectId={projectId} />;
}
