'use client';

// xterm.js 코어 컴포넌트 — next/dynamic으로만 로드됨 (SSR 없음)

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/constants';

// CSS를 JS에서 직접 로드하지 않음 — public/xterm.css를 head link로 주입

interface XTermCoreProps {
  sessionId: string;
  projectId: string;
}

/** xterm Dracula 테마 */
const THEME = {
  background: '#282A36',
  foreground: '#F8F8F2',
  cursor: '#F8F8F2',
  cursorAccent: '#282A36',
  selectionBackground: 'rgba(68,71,90,0.5)',
  black: '#21222C',
  red: '#FF5555',
  green: '#50FA7B',
  yellow: '#F1FA8C',
  blue: '#BD93F9',
  magenta: '#FF79C6',
  cyan: '#8BE9FD',
  white: '#F8F8F2',
  brightBlack: '#6272A4',
  brightRed: '#FF6E6E',
  brightGreen: '#69FF94',
  brightYellow: '#FFFFA5',
  brightBlue: '#D6ACFF',
  brightMagenta: '#FF92DF',
  brightCyan: '#A4FFFF',
  brightWhite: '#FFFFFF',
};

export default function XTermCore({ sessionId, projectId }: XTermCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // xterm CSS 동적 로드
    if (!document.querySelector('link[href="/xterm.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/xterm.css';
      document.head.appendChild(link);
    }

    // 컨테이너가 실제 크기를 가질 때까지 대기 (dimensions 에러 방지)
    const el = containerRef.current;
    if (el.clientWidth === 0 || el.clientHeight === 0) {
      const observer = new ResizeObserver(() => {
        if (el.clientWidth > 0 && el.clientHeight > 0) {
          observer.disconnect();
          initTerminal();
        }
      });
      observer.observe(el);
      cleanupRef.current = () => observer.disconnect();
      return () => { cleanupRef.current?.(); cleanupRef.current = null; };
    }

    initTerminal();

    function initTerminal() {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    requestAnimationFrame(() => fitAddon.fit());

    // Socket.IO /terminal 네임스페이스 연결
    const socket: Socket = io(`${API_URL}/terminal`, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('terminal:start', { projectId, cols: term.cols, rows: term.rows });
    });

    socket.on('terminal:output', (data: string) => term.write(data));
    socket.on('terminal:ready', ({ cwd }: { cwd: string }) => {
      term.write(`\r\n\x1b[90m# ${cwd}\x1b[0m\r\n`);
    });
    socket.on('terminal:error', ({ error }: { error: { message: string } }) => {
      term.write(`\r\n\x1b[31m오류: ${error.message}\x1b[0m\r\n`);
    });

    term.onData((data: string) => socket.emit('terminal:input', data));

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      socket.emit('terminal:resize', { cols: term.cols, rows: term.rows });
    });
    resizeObserver.observe(containerRef.current);

    cleanupRef.current = () => {
      resizeObserver.disconnect();
      term.dispose();
      socket.disconnect();
    };
    } // initTerminal 끝

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [sessionId, projectId]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', padding: 8, backgroundColor: '#282A36' }}
    />
  );
}
