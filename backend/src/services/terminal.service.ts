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

/** 터미널 세션 항목 — pty 프로세스, 소유 userId, 마지막 활동 시각, socket 참조 */
interface TerminalEntry {
  pty: PtyProcess;
  userId: string;
  /** 마지막 입력/시작 시각 (유휴 타임아웃 계산용) */
  lastActivity: number;
  /** 타임아웃 이벤트 전송을 위한 socket 참조 */
  socket: Socket;
}

/** 전체 동시 터미널 세션 최대 수 */
const MAX_TOTAL_SESSIONS = 10;

/** 사용자 1인당 최대 터미널 세션 수 */
const MAX_USER_SESSIONS = 1;

/** 유휴 세션 자동 종료 시간 — 15분 */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

/** socketId → 터미널 세션 항목 매핑 */
const ptyMap = new Map<string, TerminalEntry>();

// 1분마다 유휴 세션 정리
setInterval(() => {
  const now = Date.now();
  for (const [socketId, entry] of ptyMap.entries()) {
    if (now - entry.lastActivity > IDLE_TIMEOUT_MS) {
      entry.pty.kill();
      ptyMap.delete(socketId);
      // 클라이언트에 타임아웃 이벤트 전송
      entry.socket.emit('terminal:timeout', { message: '유휴 상태로 인해 터미널 세션이 종료되었습니다 (15분)' });
    }
  }
}, 60_000);

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

/**
 * cwd 경로에서 명령 인젝션에 악용될 수 있는 특수문자를 이스케이프
 * 큰따옴표, 백슬래시, $, 백틱을 백슬래시로 이스케이프
 */
function escapeCwd(cwd: string): string {
  return cwd.replace(/["\\`$]/g, (c) => `\\${c}`);
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
    // sudo -i 없이 직접 실행 시 cwd 옵션으로 안전하게 전달 (셸 인젝션 없음)
    cwd: runAsUser ? undefined : cwd,
    env: { ...process.env } as Record<string, string>,
  });

  // runAsUser 시 시작 디렉토리를 수동 이동 — 특수문자 이스케이프 후 큰따옴표로 감싸기
  if (runAsUser) {
    ptyProc.write(`cd "${escapeCwd(cwd)}" 2>/dev/null\n`);
  }

  return {
    pty: {
      write: (data: string) => ptyProc.write(data),
      resize: (c: number, r: number) => { try { ptyProc.resize(c, r); } catch { /* 이미 닫힌 PTY 무시 */ } },
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

  // runAsUser 시 시작 디렉토리를 수동 이동 — 특수문자 이스케이프 후 큰따옴표로 감싸기
  if (runAsUser) {
    child.stdin.write(`cd "${escapeCwd(cwd)}" 2>/dev/null\n`);
  }

  return {
    pty: {
      write: (data: string) => { try { child.stdin.write(data); } catch { /* 무시 */ } },
      kill: () => { try { child.kill('SIGTERM'); } catch { /* 무시 */ } },
    },
    onData: (cb) => { callbacks.push(cb); },
  };
}

/** 터미널 세션 시작 — runAsUser로 Linux 유저 분리, 동시 세션 수 제한 적용 */
async function startTerminal(
  socket: Socket,
  userId: string,
  cwd: string,
  cols = 80,
  rows = 24,
  runAsUser?: string,
): Promise<void> {
  // 기존 세션이 있으면 먼저 정리
  killTerminal(socket.id);

  // 전체 세션 수 제한 확인
  if (ptyMap.size >= MAX_TOTAL_SESSIONS) {
    throw new Error(`전체 터미널 세션 한도(${MAX_TOTAL_SESSIONS}개)를 초과했습니다`);
  }

  // 사용자별 기존 세션 자동 종료 (1인 1세션 정책)
  for (const [socketId, entry] of ptyMap.entries()) {
    if (entry.userId === userId) {
      entry.pty.kill();
      ptyMap.delete(socketId);
    }
  }

  let session = await spawnWithNodePty(cwd, cols, rows, runAsUser);
  if (!session) {
    socket.emit('terminal:output', '\r\n[node-pty 미설치 — child_process 모드로 실행]\r\n');
    session = spawnWithChildProcess(cwd, runAsUser);
  }

  const { pty, onData } = session;

  onData((data: string) => {
    socket.emit('terminal:output', data);
  });

  // userId, socket 참조, 마지막 활동 시각과 함께 세션 등록
  ptyMap.set(socket.id, { pty, userId, lastActivity: Date.now(), socket });
}

/** 터미널 입력 처리 — 마지막 활동 시각 갱신 */
function writeInput(socketId: string, data: string): void {
  const entry = ptyMap.get(socketId);
  if (entry) {
    entry.lastActivity = Date.now();
    entry.pty.write(data);
  }
}

/** 터미널 크기 변경 */
function resizeTerminal(socketId: string, cols: number, rows: number): void {
  ptyMap.get(socketId)?.pty.resize?.(cols, rows);
}

/** 터미널 종료 */
function killTerminal(socketId: string): void {
  const entry = ptyMap.get(socketId);
  if (entry) {
    entry.pty.kill();
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
