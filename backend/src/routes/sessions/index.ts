// 세션 라우트 — /api/sessions
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { sessionService } from '../../services/session.service.js';
import chatRoute from './chat.js';
import abortRoute from './abort.js';
import messagesRoute from './messages.js';

// 요청 타입 정의
interface ListQuery { folderId: string; status?: string }
interface IdParams { id: string }
interface CreateBody { folderId: string; title: string }
interface UpdateBody { title?: string; status?: string }

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  // 채팅, 중단, 메시지 라우트 등록
  await fastify.register(chatRoute);
  await fastify.register(abortRoute);
  await fastify.register(messagesRoute);

  // GET / — 세션 목록 (folderId 필수, status 선택)
  fastify.get<{ Querystring: ListQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['folderId'],
        properties: {
          folderId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'archived'] },
        },
      },
    },
  }, async (request) => {
    const { folderId, status } = request.query;
    return sessionService.findByFolder(folderId, status);
  });

  // POST / — 세션 생성
  fastify.post<{ Body: CreateBody }>('/', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['folderId', 'title'],
        properties: {
          folderId: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 1, maxLength: 300 },
        },
      },
    },
  }, async (request, reply) => {
    const userId = request.session.get('userId') as string;
    try {
      const session = await sessionService.create({
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
  }, async (request, reply) => {
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
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 300 },
          status: { type: 'string', enum: ['active', 'archived'] },
        },
      },
    },
  }, async (request, reply) => {
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
  }, async (request, reply) => {
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
