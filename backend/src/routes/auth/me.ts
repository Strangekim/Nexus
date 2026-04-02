// 현재 사용자 조회 라우트 — GET /api/auth/me
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

const meRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/me',
    { preHandler: [requireAuth] },
    async (request) => {
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
          // 알림 설정 필드
          phone: true,
          notifySms: true,
          notifyBrowser: true,
          notifySound: true,
        },
      });

      // 사용자 미존재 시 전역 핸들러에서 처리
      if (!user) throw createHttpError(404, '사용자를 찾을 수 없습니다');

      return user;
    },
  );
};

export default meRoute;
