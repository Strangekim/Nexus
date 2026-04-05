'use client';
// 채팅 전체 패널 — 메시지 목록 + 입력창 + 락 상태 표시

import { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SessionCreatorBanner } from './SessionCreatorBanner';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessages';
import { LockStatusBadge } from '@/components/session/LockStatusBadge';
import { LockRequestButton } from '@/components/session/LockRequestButton';
import { ArchiveButton } from '@/components/session/ArchiveButton';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthStore } from '@/stores/authStore';
import { useSession } from '@/hooks/useSession';

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

  // 서버에서 기존 메시지 로드 (역방향 무한 스크롤)
  const {
    data: messagesData,
    hasPreviousPage,
    isFetchingPreviousPage,
    fetchPreviousPage,
  } = useMessages(sessionId);

  // 락 상태 조회 — 타인 락 여부 판단
  const lock = useRealtimeStore((s) => s.sessionLocks.get(sessionId));
  const currentUser = useAuthStore((s) => s.user);
  const isLockedByOther = !!(lock && currentUser && lock.userId !== currentUser.id);
  // Claude 미연동 여부 — subscription 모드인데 OAuth 연동 안 된 경우 입력 차단
  const noClaudeAuth =
    currentUser?.authMode === 'subscription' && !(currentUser?.claudeConnected ?? false);

  // 세션 상태 조회 — 아카이브 버튼용 + 초기 락 상태 동기화
  const { data: sessionData } = useSession(sessionId);
  const setLock = useRealtimeStore((s) => s.setLock);

  // 초기 로드 시에만 API 응답으로 락 상태 동기화 — 이후는 Socket.IO 이벤트로 갱신
  // 5초 폴링이 Socket.IO 상태를 덮어쓰는 레이스 컨디션 방지
  const lockInitialized = useRef(false);
  useEffect(() => {
    if (!sessionData || lockInitialized.current) return;
    lockInitialized.current = true;
    if (sessionData.locker) {
      setLock(sessionId, {
        userId: sessionData.locker.id,
        userName: sessionData.locker.name,
        lockedAt: sessionData.lockedAt ?? new Date().toISOString(),
      });
    } else {
      setLock(sessionId, null);
    }
  }, [sessionData, sessionId, setLock]);

  // 세션 전환 시 이전 세션 메시지 즉시 제거 — key 리마운트와 이중 방어
  useEffect(() => {
    setMessages([]);
  }, [sessionId, setMessages]);

  // 무한 스크롤 페이지들을 하나의 메시지 배열로 병합
  useEffect(() => {
    if (!messagesData?.pages) return;
    const allMessages = messagesData.pages.flatMap((page) => page.messages);
    setMessages(allMessages);
  }, [messagesData, setMessages]);

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
        <div className="flex items-center gap-2">
          {/* 폴더 소속 세션만 merge/archive 버튼 표시 (프로젝트 직속 질의 세션은 제외) */}
          {sessionData && sessionData.folderId && (
            <ArchiveButton
              sessionId={sessionId}
              status={sessionData.status}
              mergeStatus={sessionData.mergeStatus}
            />
          )}
          <LockRequestButton sessionId={sessionId} />
        </div>
      </div>

      {/* 메시지 목록 — 상단 스크롤 시 이전 페이지 자동 로드 */}
      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        toolUses={toolUses}
        hasPreviousPage={hasPreviousPage}
        isFetchingPreviousPage={isFetchingPreviousPage}
        onLoadPrevious={fetchPreviousPage}
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

      {/* 입력창 — 타인 락 또는 Claude 미연동 시 비활성화 */}
      <MessageInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
        isLocked={isLockedByOther}
        noClaudeAuth={noClaudeAuth}
      />
    </div>
  );
}
