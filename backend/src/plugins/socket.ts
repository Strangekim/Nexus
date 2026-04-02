// Socket.IO 인증 미들웨어 및 룸 관리 플러그인
import type { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from '../lib/prisma.js';

/** 인증이 완료된 소켓 타입 — socket.data에 userId 저장 */
export interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & { userId: string };
}

/**
 * 세션 쿠키에서 userId를 파싱하여 socket.data.userId에 주입하는 인증 미들웨어
 * connect.sid 쿠키 → user_sessions 테이블 조회 → userId 추출
 */
async function sessionAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const cookieHeader = socket.handshake.headers.cookie ?? '';

    // connect.sid 쿠키 파싱 — s%3A 접두사 제거 후 . 앞까지 sid 추출
    const match = cookieHeader.match(/connect\.sid=(?:s%3A)?([^.;\s]+)/);
    if (!match) {
      return next(new Error('unauthorized'));
    }

    const sid = decodeURIComponent(match[1]);

    // user_sessions 테이블에서 세션 조회
    const session = await prisma.userSession.findUnique({ where: { sid } });
    if (!session) return next(new Error('unauthorized'));

    // 세션 만료 확인
    if (session.expire < new Date()) return next(new Error('unauthorized'));

    const sess = session.sess as { userId?: string };
    if (!sess.userId) return next(new Error('unauthorized'));

    // 인증된 userId를 socket.data에 주입
    socket.data.userId = sess.userId;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

/**
 * 룸 join/leave 이벤트 핸들러 등록
 * - join:project / leave:project → 'project:{id}' 룸
 * - join:session / leave:session → 'session:{id}' 룸
 */
function registerRoomHandlers(socket: AuthenticatedSocket): void {
  socket.on('join:project', async (projectId: string) => {
    if (!projectId) return;

    // DB에서 멤버십 확인 후 룸 참가 허용 — 비멤버는 join 거부
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: socket.data.userId } },
    });
    if (!member) {
      socket.emit('error:join-project', { message: '해당 프로젝트의 멤버가 아닙니다' });
      return;
    }

    socket.join(`project:${projectId}`);
  });

  socket.on('leave:project', (projectId: string) => {
    if (projectId) socket.leave(`project:${projectId}`);
  });

  socket.on('join:session', (sessionId: string) => {
    if (sessionId) socket.join(`session:${sessionId}`);
  });

  socket.on('leave:session', (sessionId: string) => {
    if (sessionId) socket.leave(`session:${sessionId}`);
  });

  socket.on('disconnect', () => {
    // Socket.IO가 자동으로 모든 룸에서 제거하므로 명시적 cleanup 불필요
    socket.rooms.clear();
  });
}

/**
 * Socket.IO 서버에 인증 미들웨어 및 룸 핸들러 등록
 * 기본 네임스페이스('/')에 적용
 */
export function registerSocketPlugin(io: SocketIOServer): void {
  // 인증 미들웨어 등록 — 모든 연결 시 세션 검증
  io.use(sessionAuthMiddleware);

  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    // userId 기준 개인 룸 자동 참가 — emitToUser()에서 활용
    authSocket.join(`user:${authSocket.data.userId}`);
    registerRoomHandlers(authSocket);
  });
}
