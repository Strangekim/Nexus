// 로그아웃 라우트 — POST /api/auth/logout
import { FastifyPluginAsync } from 'fastify';
import { createHttpError } from '../../lib/errors.js';

const logoutRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/logout', async (request, reply) => {
    // 세션이 없는 경우 전역 핸들러에서 처리
    if (!request.session.userId) throw createHttpError(401, '인증이 필요합니다');

    // 세션 파기
    await request.session.destroy();

    // 204 No Content — 성공 응답 형식 통일
    return reply.code(204).send();
  });
};

export default logoutRoute;
