// 세션 라우트 — /api/sessions
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { sessionService } from '../../services/session.service.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';
import chatRoute from './chat.js';
import abortRoute from './abort.js';
import messagesRoute from './messages.js';
import lockRoutes from './lock.js';

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

/** 세션이 요청자의 프로젝트 소속인지 검증 (폴더 소속 / 프로젝트 직속 모두 지원) */
async function assertSessionAccess(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { project: { include: { projectMembers: true } } },
  });
  if (!session) {
    throw createHttpError(404, '세션을 찾을 수 없습니다');
  }
  const isMember = session.project.projectMembers.some((m) => m.userId === userId);
  if (!isMember) {
    throw createHttpError(403, '이 세션에 접근할 권한이 없습니다');
  }
}

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  // 채팅, 중단, 메시지, 락 라우트 등록
  await fastify.register(chatRoute);
  await fastify.register(abortRoute);
  await fastify.register(messagesRoute);
  await fastify.register(lockRoutes);

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
  }, async (request) => {
    const { folderId, projectId, status } = request.query;
    const userId = request.userId;

    if (!folderId && !projectId) {
      throw createHttpError(400, 'folderId 또는 projectId가 필요합니다');
    }

    // folderId로 조회 시: 해당 폴더의 프로젝트 멤버인지 확인
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { projectId: true },
      });
      if (!folder) throw createHttpError(404, '폴더를 찾을 수 없습니다');

      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: folder.projectId, userId } },
      });
      if (!member) throw createHttpError(403, '이 폴더에 접근할 권한이 없습니다');

      return sessionService.findByFolder(folderId, status);
    }

    // projectId로 조회 시: 해당 프로젝트 멤버인지 확인
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: projectId!, userId } },
    });
    if (!member) throw createHttpError(403, '이 프로젝트에 접근할 권한이 없습니다');

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
    const userId = request.userId;

    // 프로젝트 멤버인지 확인
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: request.body.projectId, userId } },
    });
    if (!member) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '이 프로젝트에 세션을 생성할 권한이 없습니다' } });
    }

    // 에러(404 등)는 전역 핸들러에서 처리
    const session = await sessionService.create({
      projectId: request.body.projectId,
      folderId: request.body.folderId,
      title: request.body.title,
      createdBy: userId,
    });
    return reply.code(201).send(session);
  });

  // GET /:id — 세션 상세 (관계 포함)
  fastify.get<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    // 인가 검증: 에러는 전역 핸들러에서 처리
    await assertSessionAccess(request.params.id, request.userId);

    const session = await sessionService.findById(request.params.id);
    if (!session) throw createHttpError(404, '세션을 찾을 수 없습니다');

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
  }, async (request) => {
    // 인가 검증: 에러는 전역 핸들러에서 처리
    await assertSessionAccess(request.params.id, request.userId);
    // 서비스 레이어 에러(404 등)는 전역 핸들러에서 처리
    return sessionService.update(request.params.id, request.body);
  });

  // DELETE /:id — 세션 삭제
  fastify.delete<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    // 인가 검증: 에러는 전역 핸들러에서 처리
    await assertSessionAccess(request.params.id, request.userId);
    // 서비스 레이어 에러(404 등)는 전역 핸들러에서 처리
    await sessionService.remove(request.params.id);
    return reply.code(204).send();
  });
};

export default sessionRoutes;
