'use client';
// Monaco 에디터 래퍼 — @monaco-editor/react 기반 코드 편집기

import { useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MonacoEditorWrapperProps {
  path: string;
  content: string;
  language: string;
  onChange: (value: string) => void;
}

export function MonacoEditorWrapper({
  path,
  content,
  language,
  onChange,
}: MonacoEditorWrapperProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  /** 에디터 마운트 시 참조 저장 */
  const handleMount: OnMount = useCallback((editorInstance) => {
    editorRef.current = editorInstance;
    // 에디터에 포커스
    editorInstance.focus();
  }, []);

  /** 내용 변경 핸들러 */
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange],
  );

  return (
    <Editor
      key={path}
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      onChange={handleChange}
      onMount={handleMount}
      loading={
        <div className="flex items-center justify-center h-full" style={{ color: '#9CA3AF' }}>
          <span className="text-sm">에디터 로딩 중...</span>
        </div>
      }
      options={{
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 8 },
        readOnly: false,
      }}
    />
  );
}
