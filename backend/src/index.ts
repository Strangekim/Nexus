// Fastify 서버 엔트리포인트
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env.js';
import sessionPlugin from './plugins/session.js';
import authRoutes from './routes/auth/index.js';
import projectRoutes from './routes/projects/index.js';
import sessionRoutes from './routes/sessions/index.js';
import treeRoutes from './routes/tree/index.js';
import notificationRoutes from './routes/notifications/index.js';
import { registerTerminalNamespace } from './plugins/terminal.js';
import { registerSocketPlugin } from './plugins/socket.js';
import { socketService } from './services/socket.service.js';
import { lockService } from './services/lock.service.js';

const app = Fastify({ logger: true });

// 전역 에러 핸들러 — statusCode가 있는 에러를 일관된 형식으로 응답
app.setErrorHandler((err, _request, reply) => {
  const error = err as Error & { statusCode?: number };
  const statusCode = error.statusCode ?? 500;
  const code =
    statusCode === 404 ? 'NOT_FOUND' :
    statusCode === 403 ? 'FORBIDDEN' :
    statusCode === 409 ? 'CONFLICT' :
    statusCode === 400 ? 'BAD_REQUEST' :
    'INTERNAL_ERROR';

  // 500 에러는 원본 메시지를 클라이언트에 노출하지 않는다 — 로그에만 기록
  if (statusCode >= 500) {
    app.log.error({ err }, '서버 내부 오류 발생');
    reply.code(statusCode).send({
      error: { code, message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
    });
    return;
  }

  reply.code(statusCode).send({
    error: { code, message: error.message },
  });
});

// CORS 설정
await app.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
});

// 쿠키 플러그인
await app.register(cookie);

// 세션 플러그인 (쿠키 이후 등록)
await app.register(sessionPlugin);

// 헬스 체크
app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 인증 라우트
await app.register(authRoutes, { prefix: '/api/auth' });

// CRUD 라우트
await app.register(projectRoutes, { prefix: '/api/projects' });
await app.register(sessionRoutes, { prefix: '/api/sessions' });
await app.register(treeRoutes, { prefix: '/api/tree' });
await app.register(notificationRoutes, { prefix: '/api/notifications' });

// 서버 시작
const start = async () => {
  try {
    // Fastify가 내부 http.Server를 생성하기 전에 ready() 호출
    await app.ready();

    // Fastify 내부 http.Server를 Socket.IO에 직접 연결
    const io = new SocketIOServer(app.server, {
      cors: {
        origin: env.FRONTEND_URL,
        credentials: true,
      },
      path: '/socket.io',
    });

    // 기본 네임스페이스 인증 미들웨어 및 룸 핸들러 등록
    registerSocketPlugin(io);

    // 웹 터미널 네임스페이스 등록
    registerTerminalNamespace(io);

    // SocketService 싱글턴 초기화 — 브로드캐스트 유틸 사용 가능
    socketService.init(io);

    // Fastify listen (Socket.IO가 동일 http.Server를 공유)
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`서버가 포트 ${env.PORT}에서 실행 중입니다 (HTTP + Socket.IO)`);

    // 고스트 락 방지 — 서버 재시작 시 모든 락 초기화
    await lockService.clearAllLocks();
    app.log.info('기존 세션 락 초기화 완료');

    // 만료 락 자동 해제 타이머 — 60초마다 15분 초과 락 점검
    setInterval(() => {
      lockService.checkExpiredLocks().catch((err) => {
        app.log.error({ err }, '만료 락 해제 중 오류 발생');
      });
    }, 60_000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
