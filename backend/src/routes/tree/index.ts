// 트리 라우트 — /api/tree
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { treeService } from '../../services/tree.service.js';

// 요청 타입 정의
interface TreeQuery { projectId?: string }

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
};

export default treeRoutes;
