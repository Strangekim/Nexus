'use client';
// 메시지 입력창 — Textarea + 전송/중지 버튼

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
}

export function MessageInput({ onSend, onAbort, isStreaming }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** 전송 처리 */
  const handleSend = useCallback(() => {
    if (!text.trim() || isStreaming) return;
    onSend(text.trim());
    setText('');
    // 높이 리셋
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, isStreaming, onSend]);

  /** Enter로 전송, Shift+Enter로 줄바꿈 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /** 자동 높이 조절 */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    },
    [],
  );

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2 rounded-xl border px-4 py-3"
        style={{ backgroundColor: '#F9F9F4', borderColor: '#E8E5DE' }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[#6B6B7B]"
          style={{ color: '#3D3D3D', maxHeight: 200 }}
        />

        {isStreaming ? (
          <button
            onClick={onAbort}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#E0845E' }}
            aria-label="중지"
          >
            <Square size={14} fill="#fff" style={{ color: '#fff' }} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-opacity disabled:opacity-30"
            style={{ backgroundColor: '#2D7D7B' }}
            aria-label="전송"
          >
            <Send size={14} style={{ color: '#fff' }} />
          </button>
        )}
      </div>
    </div>
  );
}
