// 웹 터미널 Socket.IO 플러그인 — /terminal 네임스페이스
// Linux 유저 분리: admin은 ubuntu, 일반 멤버는 개인 linuxUser로 실행
import type { Server as SocketIOServer, Socket } from 'socket.io';
import { terminalService } from '../services/terminal.service.js';
import prisma from '../lib/prisma.js';

/** 인증된 Socket 타입 확장 */
interface AuthenticatedSocket extends Socket {
  userId: string;
}

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

  // 인증 미들웨어 — 세션 쿠키에서 userId 검증
  terminalNsp.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? '';

      // connect.sid 쿠키 파싱 — s%3A 접두사(서명된 세션 마커) 이후 '.' 이전까지 sid 추출
      const match = cookieHeader.match(/connect\.sid=s%3A([^.;]+)/);
      if (!match) return next(new Error('인증이 필요합니다'));

      const sid = decodeURIComponent(match[1]);

      // DB에서 세션 조회
      const session = await prisma.userSession.findUnique({ where: { sid } });
      if (!session) return next(new Error('유효하지 않은 세션'));

      // 세션 만료 확인
      if (session.expire < new Date()) return next(new Error('세션이 만료되었습니다'));

      const sess = session.sess as { userId?: string };
      if (!sess.userId) return next(new Error('인증이 필요합니다'));

      // 인증된 userId를 socket에 저장
      (socket as AuthenticatedSocket).userId = sess.userId;
      next();
    } catch {
      next(new Error('인증 실패'));
    }
  });

  terminalNsp.on('connection', (socket) => {
    // 미들웨어에서 주입된 인증된 userId 사용
    const userId = (socket as AuthenticatedSocket).userId;

    socket.on('terminal:start', async (payload: TerminalStartPayload) => {
      try {
        const { projectId, cols = 80, rows = 24 } = payload ?? {};

        const cwd = await resolveWorkingDir(projectId);
        const user = await resolveUser(userId);

        // admin → ubuntu 유저로 실행 (전체 접근)
        // 일반 멤버 → linuxUser로 실행 (프로젝트 디렉토리 제한)
        const isAdmin = user?.role === 'admin';
        const runAsUser = isAdmin ? undefined : (user?.linuxUser ?? undefined);

        await terminalService.startTerminal(socket, userId, cwd, cols, rows, runAsUser);
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
