// 현재 사용자 조회 라우트 — GET /api/auth/me
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import { claudeAuthService } from '../../services/claude-auth.service.js';
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
          phone: true,
          notifySms: true,
          notifyBrowser: true,
          notifySound: true,
        },
      });

      if (!user) throw createHttpError(404, '사용자를 찾을 수 없습니다');

      // OAuth 연동 여부는 credentials.json 파일 존재로 판단 (DB 아님)
      const creds = await claudeAuthService.getCredentials(userId);
      const claudeConnected = !!creds;

      return {
        ...user,
        claudeConnected,
      };
    },
  );
};

export default meRoute;
