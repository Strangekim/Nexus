'use client';
// 세션 레이아웃 — ChatPanel + 터미널 패널 + 코드 뷰어 통합

import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { TerminalToggleBar } from '@/components/terminal/TerminalToggleBar';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { CodeViewerPanel } from '@/components/code-viewer/CodeViewerPanel';
import { useCodeViewer } from '@/hooks/useCodeViewer';
import { useSession } from '@/hooks/useSession';

interface SessionLayoutProps {
  sessionId: string;
  projectId: string;
}

const DEFAULT_TERMINAL_HEIGHT = 300;

export function SessionLayout({ sessionId, projectId }: SessionLayoutProps) {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);

  const codeViewer = useCodeViewer();

  // 세션 데이터 조회 — 생성자 정보를 ChatPanel에 전달하기 위해 사용
  const { data: session } = useSession(sessionId);

  const handleTerminalToggle = () => setTerminalOpen((prev) => !prev);
  const handleTerminalClose = () => setTerminalOpen(false);

  return (
    <div className="flex flex-col h-full relative">
      {/* 채팅 영역 — 남은 공간 차지 */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          sessionId={sessionId}
          creator={session?.creator}
          onFileClick={(path) => codeViewer.openFile(path, projectId)}
        />
      </div>

      {/* 터미널 토글 바 — 항상 표시 */}
      <TerminalToggleBar isOpen={terminalOpen} onToggle={handleTerminalToggle} />

      {/* 터미널 패널 — 토글 시 표시 */}
      <TerminalPanel
        isOpen={terminalOpen}
        height={terminalHeight}
        onHeightChange={setTerminalHeight}
        onClose={handleTerminalClose}
        sessionId={sessionId}
        projectId={projectId}
      />

      {/* 코드 뷰어 패널 — 파일 선택 시 표시 */}
      <CodeViewerPanel
        isOpen={codeViewer.isOpen}
        filePath={codeViewer.filePath}
        content={codeViewer.content}
        language={codeViewer.language}
        isLoading={codeViewer.isLoading}
        error={codeViewer.error}
        onClose={codeViewer.closeFile}
      />
    </div>
  );
}
