// 카테고리 마스터 조회 API
import { FastifyPluginAsync } from 'fastify';
import { getCategoryTree } from '../../services/category.service.js';

const categoryRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/categories/tree — 전체 카테고리 트리 (major > mid > sub)
  app.get('/tree', async (_request, reply) => {
    const tree = await getCategoryTree();
    return reply.send({ categories: tree });
  });
};

export default categoryRoutes;
