'use client';
// 채팅 전체 패널 — 메시지 목록 + 입력창 + 락 상태 표시

import { useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SessionCreatorBanner } from './SessionCreatorBanner';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessages';
import { LockStatusBadge } from '@/components/session/LockStatusBadge';
import { LockRequestButton } from '@/components/session/LockRequestButton';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthStore } from '@/stores/authStore';

interface ChatPanelProps {
  sessionId: string;
  /** 세션 생성자 정보 (이어받기 배너 표시용) */
  creator?: { id: string; name: string } | null;
  /** 파일 경로 클릭 시 코드 뷰어 열기 콜백 */
  onFileClick?: (path: string) => void;
}

export function ChatPanel({ sessionId, creator, onFileClick }: ChatPanelProps) {
  const {
    messages,
    streamingText,
    isStreaming,
    toolUses,
    error,
    sendMessage,
    retrySend,
    abort,
    setMessages,
  } = useChat(sessionId);

  // 서버에서 기존 메시지 로드
  const { data } = useMessages(sessionId);

  // 락 상태 조회 — 타인 락 여부 판단
  const lock = useRealtimeStore((s) => s.sessionLocks.get(sessionId));
  const currentUser = useAuthStore((s) => s.user);
  const isLockedByOther = !!(lock && currentUser && lock.userId !== currentUser.id);
  // API 키 미등록 여부 — api 모드인데 키가 없으면 입력 차단
  const noApiKey = currentUser?.authMode === 'api' && !(currentUser?.hasClaudeKey ?? false);

  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
    }
  }, [data, setMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* 타인 세션 이어받기 안내 배너 */}
      <SessionCreatorBanner creator={creator} currentUserId={currentUser?.id} />

      {/* 락 상태 헤더 바 */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: '#E8E5DE', backgroundColor: '#F9F9F4' }}
      >
        <LockStatusBadge sessionId={sessionId} />
        <LockRequestButton sessionId={sessionId} />
      </div>

      {/* 메시지 목록 */}
      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        toolUses={toolUses}
        onFileClick={onFileClick}
      />

      {/* 에러 표시 — SSE 연결 끊김 시 재시도 버튼 포함 */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div
            className="flex items-center justify-between text-sm px-3 py-2 rounded-lg gap-3"
            style={{ backgroundColor: 'rgba(224, 132, 94, 0.15)', color: '#E0845E' }}
          >
            <span>{error}</span>
            <button
              onClick={retrySend}
              className="shrink-0 text-xs underline underline-offset-2 hover:opacity-80"
              title="마지막 메시지 재전송"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* 입력창 — 타인 락 또는 API 키 미등록 시 비활성화 */}
      <MessageInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
        isLocked={isLockedByOther}
        noApiKey={noApiKey}
      />
    </div>
  );
}
