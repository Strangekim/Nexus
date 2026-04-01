// 로그아웃 라우트 — POST /api/auth/logout
import { FastifyPluginAsync } from 'fastify';

const logoutRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/logout', async (request, reply) => {
    // 세션 파기
    await request.session.destroy();

    return reply.send({ message: '로그아웃 되었습니다.' });
  });
};

export default logoutRoute;
