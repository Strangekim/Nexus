// 웹 터미널 Socket.IO 플러그인 — /terminal 네임스페이스
// Linux 유저 분리: admin은 ubuntu, 일반 멤버는 개인 linuxUser로 실행
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

/** 프로젝트 repoPath 조회 (없거나 유효하지 않으면 홈 디렉토리) */
async function resolveWorkingDir(projectId?: string): Promise<string> {
  const fallback = process.env.HOME ?? '/tmp';
  if (!projectId) return fallback;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { repoPath: true },
    });
    return project?.repoPath ?? fallback;
  } catch {
    return fallback;
  }
}

/** 유저 정보 조회 — role, linuxUser */
async function resolveUser(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, linuxUser: true },
    });
  } catch {
    return null;
  }
}

/** Socket.IO 서버에 터미널 네임스페이스 등록 */
export function registerTerminalNamespace(io: SocketIOServer): void {
  const terminalNsp = io.of('/terminal');

  terminalNsp.on('connection', (socket) => {
    socket.on('terminal:start', async (payload: TerminalStartPayload) => {
      try {
        const { projectId, cols = 80, rows = 24 } = payload ?? {};

        // 세션에서 userId 추출 (Socket.IO handshake에서 쿠키 파싱)
        // TODO: 현재는 인증 미적용 — 추후 세션 쿠키 검증 추가
        const userId = (socket.handshake.auth as { userId?: string })?.userId;

        const cwd = await resolveWorkingDir(projectId);
        const user = userId ? await resolveUser(userId) : null;

        // admin → ubuntu 유저로 실행 (전체 접근)
        // 일반 멤버 → linuxUser로 실행 (프로젝트 디렉토리 제한)
        const isAdmin = user?.role === 'admin';
        const runAsUser = isAdmin ? undefined : (user?.linuxUser ?? undefined);

        await terminalService.startTerminal(socket, cwd, cols, rows, runAsUser);
        socket.emit('terminal:ready', {
          cwd,
          user: runAsUser ?? 'ubuntu',
          restricted: !isAdmin,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '터미널 시작 실패';
        socket.emit('terminal:error', {
          error: { code: 'TERMINAL_START_FAILED', message },
        });
      }
    });

    socket.on('terminal:input', (data: string) => {
      terminalService.writeInput(socket.id, data);
    });

    socket.on('terminal:resize', (payload: TerminalResizePayload) => {
      const { cols, rows } = payload ?? {};
      if (cols > 0 && rows > 0) {
        terminalService.resizeTerminal(socket.id, cols, rows);
      }
    });

    socket.on('disconnect', () => {
      terminalService.killTerminal(socket.id);
    });
  });
}
