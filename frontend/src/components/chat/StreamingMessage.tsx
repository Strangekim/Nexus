'use client';
// 스트리밍 마크다운 렌더링 — 점진적 텍스트 표시 + 커서 블링크

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sanitizeMarkdown } from '@/lib/markdown-sanitizer';
import { CodeBlock } from './CodeBlock';
import type { Components } from 'react-markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
}

/** 마크다운 커스텀 렌더러 */
const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const text = String(children).replace(/\n$/, '');

    // 인라인 코드 vs 코드 블록 구분
    if (!match) {
      return (
        <code
          className="px-1.5 py-0.5 rounded text-sm"
          style={{ backgroundColor: '#2A2A3E', color: '#E0845E' }}
          {...props}
        >
          {children}
        </code>
      );
    }

    return <CodeBlock language={match[1]}>{text}</CodeBlock>;
  },
};

export function StreamingMessage({
  content,
  isStreaming = false,
}: StreamingMessageProps) {
  const sanitized = isStreaming ? sanitizeMarkdown(content) : content;

  return (
    <div
      className="prose prose-invert max-w-none text-sm leading-relaxed"
      style={{ color: '#E8E8ED' }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {sanitized}
      </ReactMarkdown>
      {/* 스트리밍 중 블링크 커서 */}
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
          style={{ backgroundColor: '#2D7D7B' }}
        />
      )}
    </div>
  );
}
