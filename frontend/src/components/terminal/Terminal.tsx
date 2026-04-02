'use client';
// xterm.js 터미널 컴포넌트 — Socket.IO로 백엔드 연결 (동적 임포트로 SSR 방지)

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/constants';

interface TerminalProps {
  sessionId: string;
  projectId: string;
}

/** xterm 라이트 모드 테마 설정 */
const LIGHT_THEME = {
  background: '#FFFFFF',
  foreground: '#1A1A1A',
  cursor: '#2D7D7B',
  cursorAccent: '#FFFFFF',
  selectionBackground: 'rgba(45,125,123,0.2)',
  black: '#000000',
  red: '#D32F2F',
  green: '#2E7D32',
  yellow: '#F57F17',
  blue: '#1565C0',
  magenta: '#6A1B9A',
  cyan: '#00838F',
  white: '#EEEEEE',
  brightBlack: '#757575',
  brightRed: '#E53935',
  brightGreen: '#43A047',
  brightYellow: '#FFB300',
  brightBlue: '#1E88E5',
  brightMagenta: '#8E24AA',
  brightCyan: '#00ACC1',
  brightWhite: '#FFFFFF',
};

/** 정리 함수를 DOM 엘리먼트에 첨부하기 위한 타입 확장 */
interface ContainerWithCleanup extends HTMLDivElement {
  _cleanup?: () => void;
}

export function Terminal({ sessionId, projectId }: TerminalProps) {
  const containerRef = useRef<ContainerWithCleanup>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let mounted = true;
    const container = containerRef.current;

    /** xterm 및 addon-fit을 동적 임포트 — SSR 방지 */
    void Promise.all([
      import('@xterm/xterm' as string) as Promise<{ Terminal: new (options: unknown) => {
        loadAddon: (addon: unknown) => void;
        open: (el: HTMLElement) => void;
        write: (data: string) => void;
        onData: (cb: (data: string) => void) => void;
        dispose: () => void;
        cols: number;
        rows: number;
      }}>,
      import('@xterm/addon-fit' as string) as Promise<{ FitAddon: new () => {
        fit: () => void;
      }}>,
    ]).then(([{ Terminal: XTerm }, { FitAddon }]) => {
      if (!mounted || !containerRef.current) return;

      // xterm 인스턴스 생성
      const term = new XTerm({
        theme: LIGHT_THEME,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: true,
        allowTransparency: false,
        scrollback: 1000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      // Socket.IO 연결
      const socket = io(API_URL, { withCredentials: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        // 터미널 세션 시작 요청
        socket.emit('terminal:start', { sessionId, projectId });
      });

      // 서버 출력 수신
      socket.on('terminal:output', (data: string) => {
        term.write(data);
      });

      // 터미널 입력 → 서버 전송
      term.onData((data: string) => {
        socket.emit('terminal:input', { sessionId, data });
      });

      // 패널 리사이즈 감지 → fit 재계산
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        socket.emit('terminal:resize', {
          sessionId,
          cols: term.cols,
          rows: term.rows,
        });
      });
      resizeObserver.observe(containerRef.current);

      // 정리 함수 등록
      container._cleanup = () => {
        resizeObserver.disconnect();
        term.dispose();
        socket.disconnect();
      };
    });

    return () => {
      mounted = false;
      container._cleanup?.();
      socketRef.current = null;
    };
  }, [sessionId, projectId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        padding: '8px',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
      }}
    />
  );
}
