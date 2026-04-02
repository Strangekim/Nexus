// AI 응답 중단 라우트 — POST /api/sessions/:id/abort
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { claudeService } from '../../services/claude.service.js';
import { assertSessionAccess } from './session.handlers.js';

interface AbortParams { id: string }

const abortRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: AbortParams }>('/:id/abort', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const { id: sessionId } = request.params;

    // 세션 프로젝트 멤버십 검증 — 비멤버는 403 반환
    await assertSessionAccess(sessionId, request.userId);

    const aborted = claudeService.abort(sessionId);

    if (!aborted) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '실행 중인 작업이 없습니다' },
      });
    }

    return {
      message: '작업이 중단되었습니다.',
      sessionId,
      partialResultSaved: true,
    };
  });
};

export default abortRoute;
