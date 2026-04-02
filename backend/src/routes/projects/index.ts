// 프로젝트 라우트 등록
import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireAdmin } from '../../plugins/auth.js';
import { projectService } from '../../services/project.service.js';
import { createHttpError } from '../../lib/errors.js';
import memberRoutes from './members.js';
import folderRoutes from '../folders/index.js';

// 요청 타입 정의
interface ListQuery { page?: number; limit?: number }
interface IdParams { id: string }
interface CreateBody { name: string; repoPath: string; description?: string }
interface UpdateBody { name?: string; description?: string }

/** id params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // 폴더 라우트를 하위에 등록
  await fastify.register(folderRoutes, { prefix: '/:projectId/folders' });
  // 멤버 라우트를 하위에 등록
  await fastify.register(memberRoutes, { prefix: '/:projectId/members' });

  // GET / — 프로젝트 목록 (페이지네이션)
  fastify.get<{ Querystring: ListQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request) => {
    const { page = 1, limit = 20 } = request.query;
    return projectService.findAll(page, limit);
  });

  // POST / — 프로젝트 생성
  fastify.post<{ Body: CreateBody }>('/', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'repoPath'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          repoPath: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const project = await projectService.create(request.body);
    return reply.code(201).send(project);
  });

  // GET /:id — 프로젝트 상세
  fastify.get<{ Params: IdParams }>('/:id', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    const project = await projectService.findById(request.params.id);
    // 프로젝트 미존재 시 전역 핸들러에서 처리
    if (!project) throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
    return project;
  });

  // PATCH /:id — 프로젝트 수정
  fastify.patch<{ Params: IdParams; Body: UpdateBody }>('/:id', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    // 서비스 레이어 에러(404 등)는 전역 핸들러에서 처리
    return projectService.update(request.params.id, request.body);
  });

  // DELETE /:id — 프로젝트 삭제 (관리자 전용)
  fastify.delete<{ Params: IdParams }>('/:id', {
    preHandler: [requireAdmin],
    schema: { params: idParamsSchema },
  }, async (request, reply) => {
    // 서비스 레이어 에러(404 등)는 전역 핸들러에서 처리
    await projectService.remove(request.params.id);
    return reply.code(204).send();
  });
};

export default projectRoutes;
