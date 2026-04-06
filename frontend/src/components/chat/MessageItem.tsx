'use client';
// 개별 메시지 컴포넌트 — Claude 웹 스타일: 최종 답변만 표시, 도구 이력은 토글

import { memo, useState } from 'react';
import { StreamingMessage } from './StreamingMessage';
import { ToolUseCard } from './ToolUseCard';
import { ClaudeLogo } from './ClaudeLogo';
import { ChevronRight } from 'lucide-react';
import type { Message } from '@/types/message';

interface MessageItemProps {
  message: Message;
  onFileClick?: (path: string) => void;
}

function MessageItemRaw({ message, onFileClick }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [showTools, setShowTools] = useState(false);

  // 유저 메시지
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm break-words whitespace-pre-wrap"
          style={{
            backgroundColor: 'rgba(45, 125, 123, 0.2)',
            color: '#3D3D3D',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // 어시스턴트 메시지
  const toolDetails = message.metadata?.toolDetails;
  const hasTools = toolDetails && toolDetails.length > 0;

  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center mt-1">
        <ClaudeLogo size={24} isAnimating={false} />
      </div>
      <div className="flex-1 min-w-0 break-words">
        {/* 도구 사용 요약 토글 — 있을 때만 표시 */}
        {hasTools && (
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center gap-1 mb-1.5 text-xs transition-colors hover:text-[#2D7D7B]"
            style={{ color: '#9CA3AF' }}
          >
            <ChevronRight
              size={12}
              className="transition-transform"
              style={{ transform: showTools ? 'rotate(90deg)' : undefined }}
            />
            {toolDetails.length}개 도구 사용
          </button>
        )}
        {/* 도구 카드 — 토글 시에만 표시 */}
        {showTools && toolDetails && (
          <div className="mb-2">
            {toolDetails.map((td) => (
              <ToolUseCard
                key={td.toolId}
                toolUse={{
                  toolId: td.toolId,
                  tool: td.tool,
                  summary: td.summary,
                  input: td.input,
                  output: td.output,
                  isError: td.isError,
                  status: 'completed',
                }}
              />
            ))}
          </div>
        )}
        {/* 최종 텍스트 답변 */}
        {message.content && (
          <StreamingMessage content={message.content} onFileClick={onFileClick} />
        )}
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemRaw);
