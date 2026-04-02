/**
 * @module routes/auth/settings
 * @description 알림 설정 업데이트 라우트 — PATCH /api/auth/settings
 *
 * 인증된 사용자 본인의 알림 관련 설정(전화번호, SMS/브라우저/알림음 on-off)을 부분 업데이트한다.
 * 변경할 필드만 body에 포함하면 되며, 포함되지 않은 필드는 그대로 유지된다.
 */
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

/**
 * PATCH body 타입.
 * 모든 필드는 선택적(optional) — 변경할 필드만 전달한다.
 */
interface SettingsBody {
  /** 수신 전화번호 (null 전달 시 삭제, 최대 20자) */
  phone?: string | null;
  /** SMS 알림 활성화 여부 */
  notifySms?: boolean;
  /** 브라우저 푸시 알림 활성화 여부 */
  notifyBrowser?: boolean;
  /** 알림음 활성화 여부 */
  notifySound?: boolean;
}

const settingsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.patch<{ Body: SettingsBody }>(
    '/settings',
    {
      // 인증 미들웨어 — 로그인하지 않은 요청은 401 반환
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          // 명시되지 않은 추가 프로퍼티는 허용하지 않음 (보안)
          additionalProperties: false,
          properties: {
            // phone: null을 허용하여 번호 삭제 지원
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

      // undefined가 아닌 필드만 업데이트 데이터에 포함
      // (undefined = 변경 의사 없음, null = 값 삭제 의사 있음)
      const data: Record<string, unknown> = {};
      if (phone !== undefined)         data.phone         = phone;
      if (notifySms !== undefined)     data.notifySms     = notifySms;
      if (notifyBrowser !== undefined) data.notifyBrowser = notifyBrowser;
      if (notifySound !== undefined)   data.notifySound   = notifySound;

      // 변경할 필드가 하나도 없으면 400 오류 반환
      if (Object.keys(data).length === 0) {
        throw createHttpError(400, '변경할 설정이 없습니다');
      }

      // 업데이트 후 변경된 값을 응답으로 반환 (필요한 필드만 select)
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
