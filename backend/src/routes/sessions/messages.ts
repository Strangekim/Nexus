// 메시지 히스토리 조회 라우트 — GET /api/sessions/:id/messages
// 하이브리드 방식: JSONL 파일 우선 → DB 폴백
import { FastifyPluginAsync } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '../../plugins/auth.js';
import { messageService } from '../../services/message.service.js';
import { sessionService } from '../../services/session.service.js';
import { readJsonlMessages } from '../../services/jsonl-message.service.js';
import prisma from '../../lib/prisma.js';

interface MessagesParams { id: string }
interface MessagesQuery { page?: number; limit?: number }

/** claudeSessionId + repoPath → JSONL 파일 경로 (단일 파일, 체인 없음) */
function resolveJsonlPath(claudeSessionId: string, repoPath: string): string {
  const parts = claudeSessionId.split(':');
  const sessionId = parts.length > 1 ? parts[1] : parts[0];
  const cwdEncoded = repoPath.replace(/\//g, '-');
  const homeDir = process.env.HOME || '/home/ubuntu';
  return path.join(homeDir, '.claude', 'projects', cwdEncoded, `${sessionId}.jsonl`);
}

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
          page: { type: 'integer', default: 1, minimum: -1 },
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

    // JSONL 하이브리드: claudeSessionId가 있으면 해당 JSONL 파일에서 읽기 시도
    if (session.claudeSessionId) {
      const project = await prisma.project.findUnique({
        where: { id: session.projectId },
        select: { repoPath: true },
      });

      if (project?.repoPath) {
        const jsonlPath = resolveJsonlPath(session.claudeSessionId, project.repoPath);
        try {
          await fs.access(jsonlPath);
          const result = await readJsonlMessages(jsonlPath, page, limit);
          if (result.total > 0) {
            return {
              messages: result.messages,
              pagination: {
                page: result.effectivePage,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
              },
            };
          }
        } catch { /* JSONL 파일 없으면 DB 폴백 */ }
      }
    }

    // DB 폴백 — JSONL이 없거나 비어있으면 DB에서 읽기
    return messageService.findBySession(sessionId, page, limit);
  });
};

export default messagesRoute;
