'use client';
// 코드 블록 — Claude 웹 스타일 구문 하이라이팅 + 복사 버튼

import { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

/** 언어명 표시 매핑 */
const LANG_LABELS: Record<string, string> = {
  js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', tsx: 'TSX',
  py: 'Python', python: 'Python', rb: 'Ruby', go: 'Go',
  rs: 'Rust', java: 'Java', cpp: 'C++', c: 'C',
  sh: 'Shell', bash: 'Bash', zsh: 'Shell',
  html: 'HTML', css: 'CSS', scss: 'SCSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sql: 'SQL', prisma: 'Prisma', md: 'Markdown',
  dockerfile: 'Dockerfile', toml: 'TOML',
};

export function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lang = language || 'text';
  const label = LANG_LABELS[lang] || lang;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border" style={{ borderColor: '#E8E5DE' }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-1.5 text-xs"
        style={{ backgroundColor: '#F5F5EF', color: '#6B6B7B' }}
      >
        <span className="font-medium">{label}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: copied ? '#2D7D7B' : '#9CA3AF' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>

      {/* 코드 본문 */}
      <SyntaxHighlighter
        language={lang}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#FAFAF8',
          fontSize: '0.8125rem',
          lineHeight: '1.6',
          overflowX: 'auto',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
