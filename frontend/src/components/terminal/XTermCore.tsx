'use client';

// xterm.js 코어 컴포넌트 — next/dynamic으로만 로드됨 (SSR 없음)
// 애드온: fit, search(Ctrl+F), web-links(URL 클릭), webgl(GPU 렌더), unicode11(한글/이모지)

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { io, Socket } from 'socket.io-client';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { API_URL } from '@/lib/constants';

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
  const searchAddonRef = useRef<SearchAddon | null>(null);

  // 검색 바 상태
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /** 검색 실행 (다음/이전) */
  const handleSearch = useCallback((direction: 'next' | 'prev') => {
    const addon = searchAddonRef.current;
    if (!addon || !searchQuery) return;
    if (direction === 'next') {
      addon.findNext(searchQuery, { caseSensitive: false });
    } else {
      addon.findPrevious(searchQuery, { caseSensitive: false });
    }
  }, [searchQuery]);

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
        scrollback: 5000,
        allowProposedApi: true, // unicode11 애드온 활성화용
      });

      // 애드온 등록
      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon();
      const unicode11Addon = new Unicode11Addon();

      term.loadAddon(fitAddon);
      term.loadAddon(searchAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(unicode11Addon);
      term.unicode.activeVersion = '11'; // 한글/이모지 너비 정확히 계산

      searchAddonRef.current = searchAddon;

      term.open(containerRef.current);

      // WebGL 렌더러 시도 — 실패 시 기본 canvas 렌더러 사용
      try {
        const webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => webglAddon.dispose());
        term.loadAddon(webglAddon);
      } catch {
        // WebGL 미지원 환경 — 무시
      }

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
      // 유휴 타임아웃 처리 — 사용자에게 명시적 피드백
      socket.on('terminal:timeout', ({ message }: { message: string }) => {
        term.write(`\r\n\x1b[33m${message}\x1b[0m\r\n`);
      });

      term.onData((data: string) => socket.emit('terminal:input', data));

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        socket.emit('terminal:resize', { cols: term.cols, rows: term.rows });
      });
      resizeObserver.observe(containerRef.current);

      cleanupRef.current = () => {
        socket.off('connect');
        socket.off('terminal:output');
        socket.off('terminal:ready');
        socket.off('terminal:error');
        socket.off('terminal:timeout');
        resizeObserver.disconnect();
        searchAddonRef.current = null;
        term.dispose();
        socket.disconnect();
      };
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [sessionId, projectId]);

  // Ctrl+F 단축키로 검색 토글
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // 터미널 컨테이너에 포커스가 있을 때만 가로채기
        const active = document.activeElement;
        if (containerRef.current?.contains(active)) {
          e.preventDefault();
          setSearchOpen(true);
        }
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: '#282A36' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', padding: 8 }} />

      {/* 검색 바 — 터미널 우상단 오버레이 */}
      {searchOpen && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded shadow-lg"
          style={{ backgroundColor: '#44475A', border: '1px solid #6272A4' }}
        >
          <Search size={14} style={{ color: '#F8F8F2' }} />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(e.shiftKey ? 'prev' : 'next');
              }
            }}
            placeholder="터미널 내 검색..."
            className="bg-transparent outline-none text-xs w-48"
            style={{ color: '#F8F8F2' }}
          />
          <button
            onClick={() => handleSearch('prev')}
            className="p-0.5 rounded hover:bg-black/20"
            style={{ color: '#F8F8F2' }}
            title="이전 (Shift+Enter)"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => handleSearch('next')}
            className="p-0.5 rounded hover:bg-black/20"
            style={{ color: '#F8F8F2' }}
            title="다음 (Enter)"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="p-0.5 rounded hover:bg-black/20"
            style={{ color: '#F8F8F2' }}
            title="닫기 (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
