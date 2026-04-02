// 웹 터미널 서비스 — node-pty 기반 프로세스 관리
// node-pty 설치 실패 시 child_process.spawn으로 fallback
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Socket } from 'socket.io';

/** pty 인터페이스 — node-pty와 fallback 공용 */
interface PtyProcess {
  write: (data: string) => void;
  resize?: (cols: number, rows: number) => void;
  kill: () => void;
}

/** socketId → pty 프로세스 매핑 */
const ptyMap = new Map<string, PtyProcess>();

/** node-pty 동적 로드 시도 */
async function tryLoadNodePty() {
  try {
    const pty = await import('node-pty');
    return pty.default ?? pty;
  } catch {
    return null;
  }
}

/** node-pty로 bash 스폰 */
async function spawnWithNodePty(
  cwd: string,
  cols: number,
  rows: number,
): Promise<{ pty: PtyProcess; onData: (cb: (data: string) => void) => void } | null> {
  const pty = await tryLoadNodePty();
  if (!pty) return null;

  const ptyProc = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: { ...process.env } as Record<string, string>,
  });

  return {
    pty: {
      write: (data: string) => ptyProc.write(data),
      resize: (c: number, r: number) => ptyProc.resize(c, r),
      kill: () => {
        try { ptyProc.kill(); } catch { /* 이미 종료된 경우 무시 */ }
      },
    },
    onData: (cb) => { ptyProc.onData(cb); },
  };
}

/** child_process.spawn으로 bash 스폰 (fallback) */
function spawnWithChildProcess(
  cwd: string,
): { pty: PtyProcess; onData: (cb: (data: string) => void) => void } {
  const child = spawn('bash', ['--login'], {
    cwd,
    env: { ...process.env, TERM: 'xterm-256color' },
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;

  const callbacks: Array<(data: string) => void> = [];

  child.stdout.on('data', (data: Buffer) => {
    callbacks.forEach((cb) => cb(data.toString()));
  });
  child.stderr.on('data', (data: Buffer) => {
    callbacks.forEach((cb) => cb(data.toString()));
  });

  return {
    pty: {
      write: (data: string) => {
        try { child.stdin.write(data); } catch { /* 무시 */ }
      },
      // child_process는 resize 미지원
      kill: () => {
        try { child.kill('SIGTERM'); } catch { /* 이미 종료된 경우 무시 */ }
      },
    },
    onData: (cb) => { callbacks.push(cb); },
  };
}

/** 터미널 세션 시작 */
async function startTerminal(
  socket: Socket,
  cwd: string,
  cols = 80,
  rows = 24,
): Promise<void> {
  // 기존 세션이 있으면 먼저 종료
  killTerminal(socket.id);

  // node-pty 우선 시도, 실패 시 fallback
  let session = await spawnWithNodePty(cwd, cols, rows);
  if (!session) {
    socket.emit('terminal:output', '\r\n[node-pty 미설치 — child_process 모드로 실행]\r\n');
    session = spawnWithChildProcess(cwd);
  }

  const { pty, onData } = session;

  // pty 출력을 클라이언트로 전달
  onData((data: string) => {
    socket.emit('terminal:output', data);
  });

  ptyMap.set(socket.id, pty);
}

/** 터미널 입력 처리 */
function writeInput(socketId: string, data: string): void {
  ptyMap.get(socketId)?.write(data);
}

/** 터미널 크기 변경 */
function resizeTerminal(socketId: string, cols: number, rows: number): void {
  ptyMap.get(socketId)?.resize?.(cols, rows);
}

/** 터미널 종료 */
function killTerminal(socketId: string): void {
  const pty = ptyMap.get(socketId);
  if (pty) {
    pty.kill();
    ptyMap.delete(socketId);
  }
}

/** 활성 터미널 수 조회 (모니터링용) */
function getActiveCount(): number {
  return ptyMap.size;
}

export const terminalService = {
  startTerminal,
  writeInput,
  resizeTerminal,
  killTerminal,
  getActiveCount,
};
