// 웹 터미널 Socket.IO 플러그인 — /terminal 네임스페이스
import type { Server as SocketIOServer } from 'socket.io';
import { terminalService } from '../services/terminal.service.js';
import prisma from '../lib/prisma.js';

/** 터미널 시작 요청 페이로드 */
interface TerminalStartPayload {
  projectId?: string;
  cols?: number;
  rows?: number;
}

/** 터미널 크기 변경 페이로드 */
interface TerminalResizePayload {
  cols: number;
  rows: number;
}

/** 프로젝트 repoPath 조회 (없으면 홈 디렉토리) */
async function resolveWorkingDir(projectId?: string): Promise<string> {
  if (!projectId) return process.env.HOME ?? '/tmp';

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { repoPath: true },
  });

  return project?.repoPath ?? process.env.HOME ?? '/tmp';
}

/** Socket.IO 서버에 터미널 네임스페이스 등록 */
export function registerTerminalNamespace(io: SocketIOServer): void {
  // /terminal 네임스페이스로 분리
  const terminalNsp = io.of('/terminal');

  terminalNsp.on('connection', (socket) => {
    socket.on('terminal:start', async (payload: TerminalStartPayload) => {
      try {
        const { projectId, cols = 80, rows = 24 } = payload ?? {};
        const cwd = await resolveWorkingDir(projectId);

        await terminalService.startTerminal(socket, cwd, cols, rows);
        socket.emit('terminal:ready', { cwd });
      } catch (err) {
        const message = err instanceof Error ? err.message : '터미널 시작 실패';
        socket.emit('terminal:error', {
          error: { code: 'TERMINAL_START_FAILED', message },
        });
      }
    });

    // 클라이언트 키 입력 → pty stdin
    socket.on('terminal:input', (data: string) => {
      terminalService.writeInput(socket.id, data);
    });

    // 터미널 크기 변경 → pty resize
    socket.on('terminal:resize', (payload: TerminalResizePayload) => {
      const { cols, rows } = payload ?? {};
      if (cols > 0 && rows > 0) {
        terminalService.resizeTerminal(socket.id, cols, rows);
      }
    });

    // 연결 해제 시 pty 프로세스 정리
    socket.on('disconnect', () => {
      terminalService.killTerminal(socket.id);
    });
  });
}
