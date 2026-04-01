'use client';
// 코드 블록 — 구문 하이라이팅 + 복사 버튼 + 언어 라벨

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="relative my-3 rounded-lg overflow-hidden" style={{ backgroundColor: '#0D1117' }}>
      {/* 헤더: 언어 라벨 + 복사 버튼 */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ color: '#8B8B9E', borderBottom: '1px solid #2A2A3E' }}
      >
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: '#8B8B9E' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>

      {/* 코드 본문 */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0D1117',
          fontSize: '0.85rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
