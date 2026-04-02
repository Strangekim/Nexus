'use client';
// 메시지 입력창 — Textarea + 전송/중지 버튼

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Square, KeyRound } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  /** 타인 락 보유 시 true — 입력창 전체 비활성화 */
  isLocked?: boolean;
  /** Claude API 키 미등록 시 true — 입력창 비활성화 + 안내 표시 */
  noApiKey?: boolean;
}

export function MessageInput({ onSend, onAbort, isStreaming, isLocked = false, noApiKey = false }: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 입력창 전체 비활성화 조건 — 타인 락 또는 API 키 미등록
  const isDisabled = isLocked || noApiKey;

  /** 전송 처리 */
  const handleSend = useCallback(() => {
    if (!text.trim() || isStreaming || isDisabled) return;
    onSend(text.trim());
    setText('');
    // 높이 리셋
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, isStreaming, isDisabled, onSend]);

  /** Enter로 전송, Shift+Enter로 줄바꿈 — 비활성화 상태에서는 무시 */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isDisabled) handleSend();
      }
    },
    [handleSend, isDisabled],
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
    <div className="sticky bottom-0 w-full bg-[#F9F9F4] border-t border-[#E8E5DE] lg:static lg:border-none lg:bg-transparent">
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2 rounded-xl border px-4 py-3"
        style={{
          backgroundColor: isDisabled ? '#F5F5F0' : '#F9F9F4',
          borderColor: isDisabled ? '#E0D8D0' : '#E8E5DE',
          opacity: isDisabled ? 0.8 : 1,
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={
            noApiKey
              ? 'Claude API 키를 먼저 설정해주세요'
              : isLocked
                ? '다른 팀원이 작업 중입니다'
                : '메시지를 입력하세요...'
          }
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[#6B6B7B] disabled:cursor-not-allowed"
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
            disabled={!text.trim() || isDisabled}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-opacity disabled:opacity-30"
            style={{ backgroundColor: '#2D7D7B' }}
            aria-label="전송"
          >
            <Send size={14} style={{ color: '#fff' }} />
          </button>
        )}
      </div>

      {/* API 키 미등록 안내 */}
      {noApiKey && (
        <p className="text-center text-xs mt-1.5 flex items-center justify-center gap-1" style={{ color: '#E0845E' }}>
          <KeyRound className="size-3" />
          Claude API 키를 먼저 설정해주세요.{' '}
          <button
            type="button"
            className="underline underline-offset-2 hover:opacity-80"
            onClick={() => {
              // 알림 벨 드롭다운의 API 키 탭으로 안내 — 커스텀 이벤트 발행
              window.dispatchEvent(new CustomEvent('nexus:open-apikey-settings'));
            }}
          >
            설정하기
          </button>
        </p>
      )}

      {/* 락 안내 메시지 */}
      {isLocked && !noApiKey && (
        <p className="text-center text-xs mt-1.5" style={{ color: '#dc2626' }}>
          다른 팀원이 작업 중입니다. 작업 권한을 요청하세요.
        </p>
      )}
    </div>
    </div>
  );
}
