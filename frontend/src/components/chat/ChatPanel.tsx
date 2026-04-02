'use client';
// 채팅 전체 패널 — 메시지 목록 + 입력창

import { useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessages';

interface ChatPanelProps {
  sessionId: string;
  /** 파일 경로 클릭 시 코드 뷰어 열기 콜백 */
  onFileClick?: (path: string) => void;
}

export function ChatPanel({ sessionId, onFileClick }: ChatPanelProps) {
  const {
    messages,
    streamingText,
    isStreaming,
    toolUses,
    error,
    sendMessage,
    abort,
    setMessages,
  } = useChat(sessionId);

  // 서버에서 기존 메시지 로드
  const { data } = useMessages(sessionId);

  useEffect(() => {
    if (data?.messages) {
      setMessages(data.messages);
    }
  }, [data, setMessages]);

  return (
    <div className="flex flex-col h-full">
      {/* 메시지 목록 */}
      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        toolUses={toolUses}
        onFileClick={onFileClick}
      />

      {/* 에러 표시 */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 pb-2">
          <div
            className="text-sm px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(224, 132, 94, 0.15)', color: '#E0845E' }}
          >
            {error}
          </div>
        </div>
      )}

      {/* 입력창 */}
      <MessageInput
        onSend={sendMessage}
        onAbort={abort}
        isStreaming={isStreaming}
      />
    </div>
  );
}
