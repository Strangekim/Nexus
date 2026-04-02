// 메시지 히스토리 조회 라우트 — GET /api/sessions/:id/messages
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { messageService } from '../../services/message.service.js';
import { sessionService } from '../../services/session.service.js';

interface MessagesParams { id: string }
interface MessagesQuery { page?: number; limit?: number }

const messagesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: MessagesParams; Querystring: MessagesQuery }>('/:id/messages', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
      },
    },
  }, async (request, reply) => {
    const { id: sessionId } = request.params;

    // 세션 존재 확인
    const session = await sessionService.findById(sessionId);
    if (!session) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }

    const page = request.query.page ?? 1;
    const limit = request.query.limit ?? 20;
    return messageService.findBySession(sessionId, page, limit);
  });
};

export default messagesRoute;
