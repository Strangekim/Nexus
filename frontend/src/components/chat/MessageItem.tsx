'use client';
// 개별 메시지 컴포넌트 — 유저/어시스턴트 구분 렌더링

import { memo } from 'react';
import { StreamingMessage } from './StreamingMessage';
import { User } from 'lucide-react';
import type { Message } from '@/types/message';

interface MessageItemProps {
  message: Message;
}

function MessageItemRaw({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm"
          style={{
            backgroundColor: 'rgba(45, 125, 123, 0.2)',
            color: '#E8E8ED',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 mb-4">
      {/* 어시스턴트 아바타 */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1"
        style={{ backgroundColor: '#2D7D7B' }}
      >
        <User size={14} style={{ color: '#E8E8ED' }} />
      </div>
      {/* 어시스턴트 메시지 본문 */}
      <div className="flex-1 min-w-0">
        <StreamingMessage content={message.content} />
      </div>
    </div>
  );
}

export const MessageItem = memo(MessageItemRaw);
