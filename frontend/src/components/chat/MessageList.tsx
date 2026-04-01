'use client';
// 메시지 목록 — 자동 하단 스크롤 + 스트리밍 메시지

import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';
import { ToolUseCard } from './ToolUseCard';
import { User } from 'lucide-react';
import type { Message, ActiveToolUse } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolUses: ActiveToolUse[];
}

export function MessageList({
  messages,
  streamingText,
  isStreaming,
  toolUses,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 스트리밍 중 또는 새 메시지 시 하단 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText, toolUses.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* 기존 메시지 */}
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {/* 스트리밍 중인 어시스턴트 응답 */}
        {isStreaming && (
          <div className="flex gap-3 mb-4">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1"
              style={{ backgroundColor: '#2D7D7B' }}
            >
              <User size={14} style={{ color: '#E8E8ED' }} />
            </div>
            <div className="flex-1 min-w-0">
              {/* 도구 사용 카드들 */}
              {toolUses.map((tu) => (
                <ToolUseCard key={tu.toolId} toolUse={tu} />
              ))}
              {/* 텍스트 스트리밍 */}
              {streamingText ? (
                <StreamingMessage content={streamingText} isStreaming />
              ) : toolUses.length === 0 ? (
                // 로딩 표시
                <div className="flex items-center gap-1 py-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: '#2D7D7B', animationDelay: '0ms' }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: '#2D7D7B', animationDelay: '150ms' }}
                  />
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: '#2D7D7B', animationDelay: '300ms' }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* 스크롤 앵커 */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
