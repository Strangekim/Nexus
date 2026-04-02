// 현재 사용자 조회 라우트 — GET /api/auth/me
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import prisma from '../../lib/prisma.js';

const meRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const userId = request.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          linuxUser: true,
          authMode: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다' },
        });
      }

      return user;
    },
  );
};

export default meRoute;
