// 웹 터미널 서비스 — node-pty 기반 프로세스 관리
// Linux 유저 분리: runAsUser가 지정되면 sudo -u로 실행
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

/** 실행할 명령어와 인자 결정 — runAsUser가 있으면 sudo -u */
function resolveCommand(runAsUser?: string): { cmd: string; args: string[] } {
  if (runAsUser) {
    return { cmd: 'sudo', args: ['-u', runAsUser, '-i', 'bash'] };
  }
  return { cmd: 'bash', args: [] };
}

/** node-pty로 bash 스폰 */
async function spawnWithNodePty(
  cwd: string,
  cols: number,
  rows: number,
  runAsUser?: string,
): Promise<{ pty: PtyProcess; onData: (cb: (data: string) => void) => void } | null> {
  const pty = await tryLoadNodePty();
  if (!pty) return null;

  const { cmd, args } = resolveCommand(runAsUser);

  const ptyProc = pty.spawn(cmd, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: runAsUser ? undefined : cwd, // sudo -i는 자체적으로 홈 디렉토리 설정
    env: { ...process.env } as Record<string, string>,
  });

  // runAsUser 시 시작 디렉토리를 수동 이동
  if (runAsUser) {
    ptyProc.write(`cd ${cwd} 2>/dev/null\n`);
  }

  return {
    pty: {
      write: (data: string) => ptyProc.write(data),
      resize: (c: number, r: number) => ptyProc.resize(c, r),
      kill: () => { try { ptyProc.kill(); } catch { /* 무시 */ } },
    },
    onData: (cb) => { ptyProc.onData(cb); },
  };
}

/** child_process.spawn으로 bash 스폰 (fallback) */
function spawnWithChildProcess(
  cwd: string,
  runAsUser?: string,
): { pty: PtyProcess; onData: (cb: (data: string) => void) => void } {
  const { cmd, args } = resolveCommand(runAsUser);

  const child = spawn(cmd, [...args], {
    cwd: runAsUser ? undefined : cwd,
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

  // runAsUser 시 시작 디렉토리를 수동 이동
  if (runAsUser) {
    child.stdin.write(`cd ${cwd} 2>/dev/null\n`);
  }

  return {
    pty: {
      write: (data: string) => { try { child.stdin.write(data); } catch { /* 무시 */ } },
      kill: () => { try { child.kill('SIGTERM'); } catch { /* 무시 */ } },
    },
    onData: (cb) => { callbacks.push(cb); },
  };
}

/** 터미널 세션 시작 — runAsUser로 Linux 유저 분리 */
async function startTerminal(
  socket: Socket,
  cwd: string,
  cols = 80,
  rows = 24,
  runAsUser?: string,
): Promise<void> {
  killTerminal(socket.id);

  let session = await spawnWithNodePty(cwd, cols, rows, runAsUser);
  if (!session) {
    socket.emit('terminal:output', '\r\n[node-pty 미설치 — child_process 모드로 실행]\r\n');
    session = spawnWithChildProcess(cwd, runAsUser);
  }

  const { pty, onData } = session;

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

/** 활성 터미널 수 조회 */
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
