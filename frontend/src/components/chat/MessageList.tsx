'use client';
// 메시지 목록 — 자동 하단 스크롤 + 상단 스크롤 시 이전 메시지 로드

import { useEffect, useRef, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';
import { ToolUseCard } from './ToolUseCard';
import { ClaudeLogo } from './ClaudeLogo';
import type { Message, ActiveToolUse } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolUses: ActiveToolUse[];
  /** 이전 페이지 로드 가능 여부 */
  hasPreviousPage?: boolean;
  /** 이전 페이지 로딩 중 여부 */
  isFetchingPreviousPage?: boolean;
  /** 이전 페이지 로드 함수 */
  onLoadPrevious?: () => void;
  /** 파일 경로 클릭 시 코드 뷰어 열기 */
  onFileClick?: (path: string) => void;
}

export function MessageList({
  messages,
  streamingText,
  isStreaming,
  toolUses,
  hasPreviousPage,
  isFetchingPreviousPage,
  onLoadPrevious,
  onFileClick,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** 이전 페이지 로드 후 스크롤 위치 복원용 */
  const prevScrollHeightRef = useRef<number>(0);
  const isRestoringScroll = useRef(false);

  // 메시지 변경 시 하단 스크롤 — DOM 렌더 완료 후 실행 보장
  useEffect(() => {
    if (isRestoringScroll.current) return;
    // requestAnimationFrame으로 DOM 업데이트 후 스크롤
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages.length, streamingText, toolUses.length]);

  // 초기 로드 시 하단 스크롤 — messages 내용 자체가 바뀔 때 (세션 전환, 데이터 도착)
  const prevMsgIdRef = useRef<string>('');
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1]?.id ?? '';
    if (lastId === prevMsgIdRef.current) return;
    prevMsgIdRef.current = lastId;
    // 짧은 딜레이로 렌더 완료 보장
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  }, [messages]);

  // 이전 페이지 로드 후 스크롤 위치 복원 — 새 콘텐츠가 위에 삽입되어도 현재 보는 위치 유지
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isRestoringScroll.current) return;

    const newScrollHeight = container.scrollHeight;
    const delta = newScrollHeight - prevScrollHeightRef.current;
    container.scrollTop += delta;
    isRestoringScroll.current = false;
  }, [messages]);

  // 상단 스크롤 감지 — IntersectionObserver로 상단 센티널 관찰
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleLoadPrevious = useCallback(() => {
    if (!hasPreviousPage || isFetchingPreviousPage || !onLoadPrevious) return;
    const container = scrollContainerRef.current;
    if (container) {
      prevScrollHeightRef.current = container.scrollHeight;
      isRestoringScroll.current = true;
    }
    onLoadPrevious();
  }, [hasPreviousPage, isFetchingPreviousPage, onLoadPrevious]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handleLoadPrevious();
      },
      { root: container, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleLoadPrevious]);

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* 상단 센티널 — 스크롤이 여기에 도달하면 이전 페이지 로드 */}
        <div ref={sentinelRef} className="h-1" />

        {/* 이전 페이지 로딩 스피너 */}
        {isFetchingPreviousPage && (
          <div className="flex justify-center py-4">
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
              style={{ color: '#2D7D7B' }}
            />
          </div>
        )}

        {/* 더 이상 이전 메시지가 없을 때 안내 */}
        {!hasPreviousPage && messages.length > 0 && (
          <div className="text-center text-xs py-3" style={{ color: '#999' }}>
            대화 시작
          </div>
        )}

        {/* 기존 메시지 */}
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} onFileClick={onFileClick} />
        ))}

        {/* 스트리밍 중인 어시스턴트 응답 */}
        {isStreaming && (
          <div className="flex gap-3 mb-4">
            {/* Claude 로고 — 스트리밍 중 펄스 애니메이션 */}
            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center mt-1">
              <ClaudeLogo size={24} isAnimating />
            </div>
            <div className="flex-1 min-w-0">
              {/* 도구 사용 카드들 */}
              {toolUses.map((tu) => (
                <ToolUseCard key={tu.toolId} toolUse={tu} />
              ))}
              {/* 텍스트 스트리밍 */}
              {streamingText ? (
                <StreamingMessage content={streamingText} isStreaming onFileClick={onFileClick} />
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
