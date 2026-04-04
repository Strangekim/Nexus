// 메시지 히스토리 조회 라우트 — GET /api/sessions/:id/messages
// 관리자 전용 프로젝트의 CLI 세션은 JSONL 파일에서 직접 읽음
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { messageService } from '../../services/message.service.js';
import { sessionService } from '../../services/session.service.js';
import { resolveJsonlPaths, readJsonlMessages } from '../../services/jsonl-message.service.js';
import prisma from '../../lib/prisma.js';
import fs from 'fs/promises';

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
          limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
        },
      },
    },
  }, async (request, reply) => {
    const { id: sessionId } = request.params;
    const page = request.query.page ?? 1;
    const limit = request.query.limit ?? 50;

    // 세션 존재 확인
    const session = await sessionService.findById(sessionId);
    if (!session) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }

    // 관리자 전용 프로젝트 + claudeSessionId가 있으면 JSONL에서 읽기 시도
    if (session.claudeSessionId) {
      const project = await prisma.project.findUnique({
        where: { id: session.projectId },
        select: { isAdminOnly: true, repoPath: true },
      });

      if (project?.isAdminOnly) {
        const paths = resolveJsonlPaths(session.claudeSessionId, project.repoPath);
        // 존재하는 첫 번째 경로에서 읽기
        for (const p of paths) {
          try {
            await fs.access(p);
            const result = await readJsonlMessages(p, page, limit);
            if (result.total > 0) {
              return {
                messages: result.messages,
                pagination: {
                  page, limit,
                  total: result.total,
                  totalPages: Math.ceil(result.total / limit),
                },
              };
            }
          } catch { /* 다음 경로 시도 */ }
        }
      }
    }

    // 일반 세션 — DB에서 읽기
    return messageService.findBySession(sessionId, page, limit);
  });
};

export default messagesRoute;
