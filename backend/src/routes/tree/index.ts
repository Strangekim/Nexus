// 트리 라우트 — /api/tree
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { treeService } from '../../services/tree.service.js';
import { fileService } from '../../services/file.service.js';
import prisma from '../../lib/prisma.js';

// 요청 타입 정의
interface TreeQuery { projectId?: string }
interface FileQuery { path: string; projectId: string }

const treeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — 프로젝트 > 폴더 > 세션 중첩 트리
  fastify.get<{ Querystring: TreeQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request) => {
    const tree = await treeService.getTree(request.query.projectId);
    return { tree };
  });

  // GET /file — 파일 내용 읽기 (코드 뷰어용)
  fastify.get<{ Querystring: FileQuery }>('/file', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['path', 'projectId'],
        properties: {
          path: { type: 'string', minLength: 1 },
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { path, projectId } = request.query;
      const userId = request.userId;

      // 프로젝트 멤버십 확인 — 멤버가 아니면 403 반환
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!member) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '프로젝트 접근 권한이 없습니다' } });
      }

      const result = await fileService.readFile(projectId, path);
      return result;
    } catch (err: unknown) {
      const error = err as { code?: string; statusCode?: number; message?: string };
      const statusCode = error.statusCode ?? 500;
      const code = error.code ?? 'INTERNAL_ERROR';
      const message = error.message ?? '파일을 읽는 중 오류가 발생했습니다';
      return reply.code(statusCode).send({ error: { code, message } });
    }
  });
};

export default treeRoutes;
