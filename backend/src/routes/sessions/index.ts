// 세션 라우트 — /api/sessions
// 핸들러 로직은 session.handlers.ts로 분리됨
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import chatRoute from './chat.js';
import abortRoute from './abort.js';
import messagesRoute from './messages.js';
import lockRoutes from './lock.js';
import mergeRoute from './merge.js';
import {
  handleList,
  handleCreate,
  handleGetOne,
  handleUpdate,
  handleDelete,
  type ListQuery,
  type IdParams,
  type CreateBody,
  type UpdateBody,
} from './session.handlers.js';

/** params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  // 채팅, 중단, 메시지, 락, merge 라우트 등록
  await fastify.register(chatRoute);
  await fastify.register(abortRoute);
  await fastify.register(messagesRoute);
  await fastify.register(lockRoutes);
  await fastify.register(mergeRoute);

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
  }, handleList);

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
  }, handleCreate);

  // GET /:id — 세션 상세 (관계 포함)
  fastify.get<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, handleGetOne);

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
  }, handleUpdate);

  // DELETE /:id — 세션 삭제
  fastify.delete<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, handleDelete);
};

export default sessionRoutes;
