// 세션 라우트 — /api/sessions
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { sessionService } from '../../services/session.service.js';
import prisma from '../../lib/prisma.js';
import chatRoute from './chat.js';
import abortRoute from './abort.js';
import messagesRoute from './messages.js';

// 요청 타입 정의
interface ListQuery { folderId?: string; projectId?: string; status?: string }
interface IdParams { id: string }
interface CreateBody { projectId: string; folderId?: string; title: string }
interface UpdateBody { title?: string; status?: string }

/** params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

/**
 * 세션이 요청자(userId)의 프로젝트 소속인지 검증
 * 세션 → 폴더 → 프로젝트 → 멤버 관계를 확인
 */
/** 세션이 요청자의 프로젝트 소속인지 검증 (폴더 소속 / 프로젝트 직속 모두 지원) */
async function assertSessionAccess(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { project: { include: { projectMembers: true } } },
  });
  if (!session) {
    throw Object.assign(new Error('세션을 찾을 수 없습니다'), { statusCode: 404 });
  }
  const isMember = session.project.projectMembers.some((m) => m.userId === userId);
  if (!isMember) {
    throw Object.assign(new Error('이 세션에 접근할 권한이 없습니다'), { statusCode: 403 });
  }
}

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  // 채팅, 중단, 메시지 라우트 등록
  await fastify.register(chatRoute);
  await fastify.register(abortRoute);
  await fastify.register(messagesRoute);

  // GET / — 세션 목록 (folderId 또는 projectId로 필터)
  fastify.get<{ Querystring: ListQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          folderId: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'archived'] },
        },
      },
    },
  }, async (request, reply) => {
    const { folderId, projectId, status } = request.query;
    if (!folderId && !projectId) {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'folderId 또는 projectId가 필요합니다' } });
    }
    if (folderId) return sessionService.findByFolder(folderId, status);
    return sessionService.findByProject(projectId!, status);
  });

  // POST / — 세션 생성 (projectId 필수, folderId 선택)
  fastify.post<{ Body: CreateBody }>('/', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['projectId', 'title'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          folderId: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.session.get('userId') as string;

    // 프로젝트 멤버인지 확인
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: request.body.projectId, userId } },
    });
    if (!member) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '이 프로젝트에 세션을 생성할 권한이 없습니다' } });
    }

    try {
      const session = await sessionService.create({
        projectId: request.body.projectId,
        folderId: request.body.folderId,
        title: request.body.title,
        createdBy: userId,
      });
      return reply.code(201).send(session);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: error.message },
        });
      }
      throw err;
    }
  });

  // GET /:id — 세션 상세 (관계 포함)
  fastify.get<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    const userId = request.session.get('userId') as string;

    // 인가 검증: 해당 세션이 요청자의 프로젝트 소속인지 확인
    try {
      await assertSessionAccess(request.params.id, userId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: error.statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN', message: error.message },
      });
    }

    const session = await sessionService.findById(request.params.id);
    if (!session) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }
    return session;
  });

  // PATCH /:id — 세션 수정
  fastify.patch<{ Params: IdParams; Body: UpdateBody }>('/:id', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 300 },
          status: { type: 'string', enum: ['active', 'archived'] },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.session.get('userId') as string;

    // 인가 검증: 해당 세션이 요청자의 프로젝트 소속인지 확인
    try {
      await assertSessionAccess(request.params.id, userId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: error.statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN', message: error.message },
      });
    }

    try {
      return await sessionService.update(request.params.id, request.body);
    } catch {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }
  });

  // DELETE /:id — 세션 삭제
  fastify.delete<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    const userId = request.session.get('userId') as string;

    // 인가 검증: 해당 세션이 요청자의 프로젝트 소속인지 확인
    try {
      await assertSessionAccess(request.params.id, userId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: error.statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN', message: error.message },
      });
    }

    try {
      await sessionService.remove(request.params.id);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }
  });
};

export default sessionRoutes;
