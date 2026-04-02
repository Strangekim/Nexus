// 커밋 목록 조회 라우트 — GET /api/projects/:id/commits
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../../plugins/auth.js';
import prisma from '../../../lib/prisma.js';
import { createHttpError } from '../../../lib/errors.js';

/** 쿼리 파라미터 타입 */
interface CommitsQuery {
  limit?: number;
  offset?: number;
  sessionId?: string;
  author?: string;
}

/** 라우트 파라미터 타입 */
interface ProjectParams { id: string }

const commitsIndexRoute: FastifyPluginAsync = async (fastify) => {
  // GET / — 커밋 목록 페이지네이션 + 필터
  fastify.get<{ Params: ProjectParams; Querystring: CommitsQuery }>('/', {
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
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sessionId: { type: 'string', format: 'uuid' },
          author: { type: 'string', maxLength: 100 },
        },
      },
    },
  }, async (request) => {
    const { id: projectId } = request.params;
    const { limit = 20, offset = 0, sessionId, author } = request.query;

    // 프로젝트 존재 여부 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw createHttpError(404, '프로젝트를 찾을 수 없습니다');

    // where 조건 구성
    const where: Record<string, unknown> = { projectId };
    if (sessionId) where.sessionId = sessionId;
    if (author) where.author = { contains: author, mode: 'insensitive' };

    const [commits, total] = await Promise.all([
      prisma.commit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          session: { select: { id: true, title: true, branchName: true } },
        },
      }),
      prisma.commit.count({ where }),
    ]);

    return { commits, total, limit, offset };
  });
};

export default commitsIndexRoute;
