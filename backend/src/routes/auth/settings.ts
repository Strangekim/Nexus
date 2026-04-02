// 알림 설정 업데이트 라우트 — PATCH /api/auth/settings
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

/** PATCH body 타입 */
interface SettingsBody {
  phone?: string | null;
  notifySms?: boolean;
  notifyBrowser?: boolean;
  notifySound?: boolean;
}

const settingsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Body: SettingsBody }>(
    '/settings',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            phone:         { type: ['string', 'null'], maxLength: 20 },
            notifySms:     { type: 'boolean' },
            notifyBrowser: { type: 'boolean' },
            notifySound:   { type: 'boolean' },
          },
        },
      },
    },
    async (request) => {
      const userId = request.userId;
      const { phone, notifySms, notifyBrowser, notifySound } = request.body;

      // 업데이트할 필드만 추출 (undefined는 제외)
      const data: Record<string, unknown> = {};
      if (phone !== undefined)         data.phone         = phone;
      if (notifySms !== undefined)     data.notifySms     = notifySms;
      if (notifyBrowser !== undefined) data.notifyBrowser = notifyBrowser;
      if (notifySound !== undefined)   data.notifySound   = notifySound;

      if (Object.keys(data).length === 0) {
        throw createHttpError(400, '변경할 설정이 없습니다');
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          phone: true,
          notifySms: true,
          notifyBrowser: true,
          notifySound: true,
        },
      });

      return updated;
    },
  );
};

export default settingsRoute;
