// 세션 플러그인 — PostgreSQL 스토어 기반 httpOnly 쿠키 세션
import fp from 'fastify-plugin';
import session, { type FastifySessionOptions } from '@fastify/session';
import connectPgSimple from 'connect-pg-simple';
import { env } from '../config/env.js';

// fastify Session 타입 확장 — userId 저장용
declare module 'fastify' {
  interface Session {
    userId: string;
  }
}

// connect-pg-simple에 Store 생성자를 전달하기 위한 어댑터
const PgStore = connectPgSimple(session as never);

export default fp(async (fastify) => {
  const store = new PgStore({
    conString: env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: false,
  });

  const sessionOptions: FastifySessionOptions = {
    secret: env.SESSION_SECRET,
    store: store as unknown as FastifySessionOptions['store'],
    cookieName: 'connect.sid',
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      path: '/',
    },
    saveUninitialized: false,
  };

  await fastify.register(session, sessionOptions);
}, { name: 'session-plugin' });
