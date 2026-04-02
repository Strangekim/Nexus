// 현재 사용자 조회 라우트 — GET /api/auth/me
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

/**
 * Claude API 키를 마스킹 처리한다.
 * 앞 8자 + "..." + 뒤 4자만 노출. 12자 이하면 전체 마스킹.
 * 예: "sk-ant-api03-xxxx" → "sk-ant-ap...xxxx"
 */
function maskApiKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

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
          // claudeAccount: 마스킹 후 응답 (평문 노출 금지)
          claudeAccount: true,
          // 알림 설정 필드
          phone: true,
          notifySms: true,
          notifyBrowser: true,
          notifySound: true,
        },
      });

      // 사용자 미존재 시 전역 핸들러에서 처리
      if (!user) throw createHttpError(404, '사용자를 찾을 수 없습니다');

      const { claudeAccount, ...rest } = user;

      return {
        ...rest,
        // API 키 존재 여부 (boolean)
        hasClaudeKey: !!claudeAccount,
        // 마스킹된 키 표시 — 없으면 null
        claudeAccountMasked: claudeAccount ? maskApiKey(claudeAccount) : null,
      };
    },
  );
};

export default meRoute;
