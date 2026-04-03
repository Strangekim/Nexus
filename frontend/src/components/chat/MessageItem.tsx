'use client';
// 개별 메시지 컴포넌트 — 유저/어시스턴트 구분 렌더링 + 도구 사용 이력 표시

import { memo } from 'react';
import { StreamingMessage } from './StreamingMessage';
import { ToolUseCard } from './ToolUseCard';
import { User } from 'lucide-react';
import type { Message, ActiveToolUse } from '@/types/message';

interface MessageItemProps {
  message: Message;
  onFileClick?: (path: string) => void;
}

function MessageItemRaw({ message, onFileClick }: MessageItemProps) {
  const isUser = message.role === 'user';

  // 유저 메시지
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
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

  // 어시스턴트 메시지 — 도구 사용 이력 + 텍스트
  const toolDetails = message.metadata?.toolDetails;

  return (
    <div className="flex gap-3 mb-4">
      {/* 어시스턴트 아바타 */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1"
        style={{ backgroundColor: '#2D7D7B' }}
      >
        <User size={14} style={{ color: '#FFFFFF' }} />
      </div>
      <div className="flex-1 min-w-0">
        {/* 도구 사용 이력 카드 — metadata에 저장된 상세 정보 */}
        {toolDetails && toolDetails.length > 0 && (
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
        {/* 텍스트 본문 */}
        <StreamingMessage content={message.content} onFileClick={onFileClick} />
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemRaw);
