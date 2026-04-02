// 로그아웃 라우트 — POST /api/auth/logout
import { FastifyPluginAsync } from 'fastify';

const logoutRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/logout', async (request, reply) => {
    // 세션이 없는 경우 에러 반환
    if (!request.session.userId) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      });
    }

    // 세션 파기
    await request.session.destroy();

    return reply.send({ message: '로그아웃 되었습니다.' });
  });
};

export default logoutRoute;
