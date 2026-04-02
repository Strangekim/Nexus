'use client';
// PM 자연어 질의 패널 — 프로젝트 컨텍스트 기반 AI 질의/응답 (SSE 스트리밍)

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Square, ChevronDown, ChevronUp, BotMessageSquare } from 'lucide-react';
import { usePMQuery } from '@/hooks/usePMQuery';

interface Props {
  /** 현재 선택된 프로젝트 ID */
  projectId: string;
}

export default function PMQueryPanel({ projectId }: Props) {
  const [inputText, setInputText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { responseText, isStreaming, error, sendQuery, abort, reset } = usePMQuery();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  // 응답 영역 자동 스크롤
  useEffect(() => {
    if (responseRef.current && responseText) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [responseText]);

  // projectId 변경 시 기존 응답 초기화
  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmit = () => {
    if (!inputText.trim() || !projectId || isStreaming) return;
    reset();
    setIsCollapsed(false);
    sendQuery(projectId, inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter 줄바꿈, Enter 단독 전송
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasResponse = !!responseText || !!error;

  return (
    <div className="bg-white border border-[#E8E5DE] rounded-xl shadow-none overflow-hidden mb-6">
      {/* 패널 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E8E5DE]">
        <BotMessageSquare size={16} className="text-[#2D7D7B]" />
        <span className="text-sm font-semibold text-[#1A1A1A]">PM 질의</span>
        <span className="text-xs text-[#6B6B7B] hidden sm:inline">
          — 프로젝트 현황을 AI에게 물어보세요
        </span>
        {/* 응답 영역 접기/펼치기 */}
        {hasResponse && (
          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className="ml-auto text-[#6B6B7B] hover:text-[#2D7D7B] transition-colors"
            title={isCollapsed ? '응답 펼치기' : '응답 접기'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
      </div>

      {/* 응답 영역 */}
      {hasResponse && !isCollapsed && (
        <div
          ref={responseRef}
          className="px-5 py-4 max-h-72 overflow-y-auto border-b border-[#E8E5DE] bg-[#F5F5EF]"
        >
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <div className="prose prose-sm max-w-none text-[#1A1A1A] prose-headings:text-[#1A1A1A] prose-headings:font-semibold prose-code:text-[#2D7D7B] prose-pre:bg-white prose-pre:border prose-pre:border-[#E8E5DE] prose-a:text-[#2D7D7B]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {responseText}
              </ReactMarkdown>
              {/* 스트리밍 중 커서 */}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-[#2D7D7B] animate-pulse ml-0.5 align-middle rounded-sm" />
              )}
            </div>
          )}
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex items-end gap-2 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            projectId
              ? '프로젝트에 대해 물어보세요... (예: 이번 주 뭘 했어? / 인증 모듈 어디까지 됐어?)'
              : '프로젝트를 먼저 선택하세요'
          }
          rows={2}
          disabled={isStreaming || !projectId}
          className="flex-1 resize-none text-sm border border-[#E8E5DE] rounded-lg px-3 py-2 bg-white text-[#1A1A1A] placeholder-[#A8A89B] outline-none focus:ring-1 focus:ring-[#2D7D7B] disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
        />
        {isStreaming ? (
          <button
            onClick={abort}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#E0845E] hover:bg-[#cc7050] transition-colors"
            title="중단"
          >
            <Square size={14} fill="white" className="text-white" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || !projectId}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[#2D7D7B] hover:bg-[#256361] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="전송 (Enter)"
          >
            <Send size={14} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
