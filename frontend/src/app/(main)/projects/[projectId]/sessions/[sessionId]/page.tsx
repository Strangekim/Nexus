// 세션 채팅 페이지

import { ChatPanel } from '@/components/chat/ChatPanel';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ChatPanel sessionId={sessionId} />;
}
