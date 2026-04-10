// 골드셋 조회 API
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { listGoldSet, getGoldSetStats } from '../../services/goldset.service.js';

const goldSetRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/gold-set/stats — 통계 (전체/대분류별/최근 30일)
  app.get('/stats', { preHandler: [requireAuth] }, async (_request, reply) => {
    const stats = await getGoldSetStats();
    return reply.send({ stats });
  });

  // GET /api/gold-set — 골드셋 목록 (필터 + 페이지네이션)
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const { major, mid, sub, page, limit } = request.query as {
      major?: string;
      mid?: string;
      sub?: string;
      page?: string;
      limit?: string;
    };
    const result = await listGoldSet({
      major,
      mid,
      sub,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return reply.send(result);
  });
};

export default goldSetRoutes;
