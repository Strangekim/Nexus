'use client';
// 편집기 textarea — 모노스페이스 폰트, 전체 높이

interface EditorTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

/** 마크다운 편집용 textarea — 모노스페이스, 전체 높이 */
export function EditorTextarea({ value, onChange, placeholder, isLoading }: EditorTextareaProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]"
        style={{ color: '#6B6B7B' }}>
        <span className="text-sm">불러오는 중...</span>
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full h-full min-h-[calc(100vh-260px)] p-4 resize-none outline-none text-sm leading-relaxed"
      style={{
        fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
        color: '#1A1A2E',
        background: 'white',
        border: 'none',
        caretColor: '#2D7D7B',
      }}
    />
  );
}
