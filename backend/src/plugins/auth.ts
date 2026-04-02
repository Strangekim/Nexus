// 인증 미들웨어 — 세션 기반 사용자 인증
import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma.js';

// FastifyRequest에 userId 속성 추가 — requireAuth preHandler에서 설정됨
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

/** 로그인 여부 확인 preHandler — request.userId를 설정한다 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.session.get('userId');
  if (!userId) {
    return reply.code(401).send({
      error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' },
    });
  }
  // 이후 라우트 핸들러에서 request.userId로 접근 가능
  request.userId = userId as string;
}

/** 관리자 권한 확인 preHandler (로그인 + admin 역할) */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.session.get('userId');
  if (!userId) {
    return reply.code(401).send({
      error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' },
    });
  }
  request.userId = userId as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== 'admin') {
    return reply.code(403).send({
      error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' },
    });
  }
}
