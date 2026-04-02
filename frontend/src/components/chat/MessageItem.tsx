'use client';
// 개별 메시지 컴포넌트 — 유저/어시스턴트 구분 렌더링

import { memo } from 'react';
import { StreamingMessage } from './StreamingMessage';
import { ToolUseCard } from './ToolUseCard';
import { User } from 'lucide-react';
import type { Message, ActiveToolUse } from '@/types/message';

interface MessageItemProps {
  message: Message;
  /** 파일 경로 클릭 콜백 */
  onFileClick?: (path: string) => void;
}

/** tool_use 타입 메시지의 content(JSON)를 ActiveToolUse 형태로 파싱 */
function parseToolUse(content: string): ActiveToolUse | null {
  try {
    const parsed = JSON.parse(content) as {
      tool?: string;
      status?: string;
      input?: Record<string, unknown>;
      output?: string;
      isError?: boolean;
    };
    if (!parsed.tool) return null;
    return {
      toolId: crypto.randomUUID(),
      tool: parsed.tool,
      status: parsed.status === 'running' ? 'running' : 'completed',
      input: parsed.input,
      output: parsed.output,
      isError: parsed.isError ?? false,
    };
  } catch {
    return null;
  }
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

  // tool_use 타입 메시지 — ToolUseCard로 렌더링
  if (message.type === 'tool_use') {
    const toolUse = parseToolUse(message.content);
    if (!toolUse) return null;
    return (
      <div className="flex gap-3 mb-2">
        {/* 아바타 자리 확보 (정렬 유지) */}
        <div className="flex-shrink-0 w-7" />
        <div className="flex-1 min-w-0">
          <ToolUseCard toolUse={toolUse} />
        </div>
      </div>
    );
  }

  // 어시스턴트 텍스트 메시지
  return (
    <div className="flex gap-3 mb-4">
      {/* 어시스턴트 아바타 */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1"
        style={{ backgroundColor: '#2D7D7B' }}
      >
        <User size={14} style={{ color: '#3D3D3D' }} />
      </div>
      {/* 어시스턴트 메시지 본문 */}
      <div className="flex-1 min-w-0">
        <StreamingMessage content={message.content} onFileClick={onFileClick} />
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemRaw);
