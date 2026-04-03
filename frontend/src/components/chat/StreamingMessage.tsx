'use client';
// 스트리밍 마크다운 렌더링 — 점진적 텍스트 표시 + 커서 블링크 + 파일 경로 클릭

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sanitizeMarkdown } from '@/lib/markdown-sanitizer';
import { CodeBlock } from './CodeBlock';
import type { Components } from 'react-markdown';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  /** 파일 경로 클릭 시 코드 뷰어 열기 콜백 */
  onFileClick?: (path: string) => void;
}

/** 파일 경로 패턴 소스 — 매 호출마다 새 RegExp 생성 */
const FILE_PATH_SOURCE =
  /(?:\/[\w./-]+|[\w.-]+\/[\w./-]+|[\w-]+\.(?:ts|tsx|js|jsx|py|rs|go|json|yaml|yml|md|css|scss|html|sh|prisma|env))(?:\b|$)/.source;

/** 텍스트에서 파일 경로를 감지하여 클릭 가능한 span으로 변환 */
function FileLinkText({
  text,
  onFileClick,
}: {
  text: string;
  onFileClick?: (path: string) => void;
}) {
  if (!onFileClick) return <>{text}</>;

  // 매 호출마다 새 정규식 인스턴스 생성 (lastIndex 부작용 방지)
  const pattern = new RegExp(FILE_PATH_SOURCE, 'g');
  const parts: Array<{ isPath: boolean; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ isPath: false, value: text.slice(lastIndex, match.index) });
    }
    parts.push({ isPath: true, value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ isPath: false, value: text.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.isPath ? (
          <button
            key={i}
            onClick={() => onFileClick(part.value)}
            className="underline decoration-dotted transition-colors"
            style={{ color: '#2D7D7B', cursor: 'pointer' }}
            title={`파일 열기: ${part.value}`}
          >
            {part.value}
          </button>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}

/** 마크다운 커스텀 렌더러 생성 — onFileClick 클로저로 캡처 */
function makeComponents(onFileClick?: (path: string) => void): Components {
  return {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const text = String(children).replace(/\n$/, '');

      // 인라인 코드 — 파일 경로 감지 시 클릭 가능
      if (!match) {
        const isPath = new RegExp(FILE_PATH_SOURCE).test(text.trim());
        return (
          <code
            className="px-1.5 py-0.5 rounded text-sm"
            style={{
              backgroundColor: '#E8E5DE',
              color: isPath && onFileClick ? '#2D7D7B' : '#E0845E',
              cursor: isPath && onFileClick ? 'pointer' : 'auto',
              textDecoration: isPath && onFileClick ? 'underline dotted' : 'none',
            }}
            onClick={isPath && onFileClick ? () => onFileClick(text.trim()) : undefined}
            title={isPath && onFileClick ? `파일 열기: ${text.trim()}` : undefined}
            {...props}
          >
            {children}
          </code>
        );
      }

      return <CodeBlock language={match[1]}>{text}</CodeBlock>;
    },
    // 단락 내 파일 경로 감지
    p({ children }) {
      return (
        <p>
          {typeof children === 'string' ? (
            <FileLinkText text={children} onFileClick={onFileClick} />
          ) : (
            children
          )}
        </p>
      );
    },
  };
}

export function StreamingMessage({
  content,
  isStreaming = false,
  onFileClick,
}: StreamingMessageProps) {
  const sanitized = isStreaming ? sanitizeMarkdown(content) : content;
  const components = makeComponents(onFileClick);

  return (
    <div className="chat-markdown max-w-none">
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
