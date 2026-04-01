// 폴더 라우트 — /api/projects/:projectId/folders
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { folderService } from '../../services/folder.service.js';

// 요청 타입 정의
interface ProjectParams { projectId: string }
interface FolderParams extends ProjectParams { id: string }
interface CreateBody { name: string; description?: string }
interface UpdateBody { name?: string; description?: string }

const folderRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — 프로젝트 내 폴더 목록
  fastify.get<{ Params: ProjectParams }>('/', {
    preHandler: [requireAuth],
  }, async (request) => {
    return folderService.findByProject(request.params.projectId);
  });

  // POST / — 폴더 생성
  fastify.post<{ Params: ProjectParams; Body: CreateBody }>('/', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const folder = await folderService.create(request.params.projectId, request.body);
      return reply.code(201).send(folder);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 409) {
        return reply.code(409).send({
          error: { code: 'CONFLICT', message: error.message },
        });
      }
      throw err;
    }
  });

  // GET /:id — 폴더 상세
  fastify.get<{ Params: FolderParams }>('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const folder = await folderService.findById(request.params.id);
    if (!folder) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '폴더를 찾을 수 없습니다' },
      });
    }
    return folder;
  });

  // PATCH /:id — 폴더 수정
  fastify.patch<{ Params: FolderParams; Body: UpdateBody }>('/:id', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      return await folderService.update(request.params.id, request.body);
    } catch {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '폴더를 찾을 수 없습니다' },
      });
    }
  });

  // DELETE /:id — 폴더 삭제
  fastify.delete<{ Params: FolderParams }>('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      await folderService.remove(request.params.id);
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '폴더를 찾을 수 없습니다' },
      });
    }
  });
};

export default folderRoutes;
