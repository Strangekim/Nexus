// Fastify 서버 엔트리포인트
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import sessionPlugin from './plugins/session.js';
import authRoutes from './routes/auth/index.js';
import projectRoutes from './routes/projects/index.js';
import sessionRoutes from './routes/sessions/index.js';
import treeRoutes from './routes/tree/index.js';

const app = Fastify({ logger: true });

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

// 서버 시작
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`서버가 포트 ${env.PORT}에서 실행 중입니다`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
