// 알림 라우트 — /api/notifications
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import prisma from '../../lib/prisma.js';
import { createHttpError } from '../../lib/errors.js';

/** 목록 조회 쿼리 파라미터 */
interface ListQuery {
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/** URL 파라미터 */
interface IdParams { id: string }

/** 읽음 처리 body */
interface PatchBody { isRead: boolean }

/** params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

/** 알림이 요청자 소유인지 확인 — 아니면 403 throw */
async function assertOwner(notifId: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notifId } });
  if (!notif) throw createHttpError(404, '알림을 찾을 수 없습니다');
  if (notif.userId !== userId) throw createHttpError(403, '이 알림에 접근할 권한이 없습니다');
  return notif;
}

const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  // PATCH /read-all — 전체 읽음 처리 (/:id 보다 먼저 등록해야 매칭 정확)
  fastify.patch('/read-all', { preHandler: [requireAuth] }, async (request, reply) => {
    await prisma.notification.updateMany({
      where: { userId: request.userId, isRead: false },
      data: { isRead: true },
    });
    return reply.code(200).send({ message: '전체 읽음 처리 완료' });
  });

  // GET / — 내 알림 목록 (isRead 필터, 페이지네이션, 최신순)
  fastify.get<{ Querystring: ListQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          isRead: { type: 'boolean' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
    },
  }, async (request) => {
    const { isRead, limit = 20, offset = 0 } = request.query;

    return prisma.notification.findMany({
      where: {
        userId: request.userId,
        // isRead가 undefined이면 필터 적용 안 함
        ...(isRead !== undefined && { isRead }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  });

  // PATCH /:id — 개별 읽음 처리
  fastify.patch<{ Params: IdParams; Body: PatchBody }>('/:id', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        required: ['isRead'],
        properties: { isRead: { type: 'boolean' } },
      },
    },
  }, async (request) => {
    // 본인 알림인지 확인
    await assertOwner(request.params.id, request.userId);

    return prisma.notification.update({
      where: { id: request.params.id },
      data: { isRead: request.body.isRead },
    });
  });

  // DELETE /:id — 알림 삭제
  fastify.delete<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    // 본인 알림인지 확인
    await assertOwner(request.params.id, request.userId);

    await prisma.notification.delete({ where: { id: request.params.id } });
    return reply.code(204).send();
  });
};

export default notificationRoutes;
