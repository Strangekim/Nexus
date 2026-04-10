// 골드셋 라운드 API — 생성/조회/응답/판정
import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireAdmin } from '../../plugins/auth.js';
import {
  createRound,
  listRounds,
  getRoundDetail,
  closeRound,
  submitResponse,
  getRoundResults,
} from '../../services/round.service.js';

const roundRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/rounds — 라운드 생성 (관리자)
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { title, count, strategy, excludeGoldSet } = request.body as {
      title: string;
      count: number;
      strategy?: 'random' | 'sparse_category';
      excludeGoldSet?: boolean;
    };
    if (!title || !count || count < 1 || count > 200) {
      return reply.code(400).send({
        error: { code: 'INVALID_REQUEST', message: 'title과 1~200 범위의 count가 필요합니다' },
      });
    }
    const round = await createRound({
      title,
      count,
      strategy,
      excludeGoldSet,
      createdBy: request.userId,
    });
    return reply.send({ round });
  });

  // GET /api/rounds — 라운드 목록 (내 진행률 포함)
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const rounds = await listRounds(request.userId);
    return reply.send({ rounds });
  });

  // GET /api/rounds/:id — 라운드 상세 (items + 내 응답)
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const round = await getRoundDetail(id, request.userId);
    if (!round) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '라운드를 찾을 수 없습니다' },
      });
    }
    return reply.send({ round });
  });

  // POST /api/rounds/:id/close — 라운드 마감 (관리자)
  app.post('/:id/close', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const round = await closeRound(id);
    return reply.send({ round });
  });

  // GET /api/rounds/:id/results — 라운드 결과 (관리자)
  app.get('/:id/results', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const results = await getRoundResults(id);
    return reply.send(results);
  });

  // POST /api/rounds/items/:itemId/respond — 응답 제출 + 자동 판정
  app.post(
    '/items/:itemId/respond',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { itemId } = request.params as { itemId: string };
      const { major, mid, sub } = request.body as {
        major: string;
        mid: string;
        sub: string | null;
      };
      if (!major || !mid) {
        return reply.code(400).send({
          error: { code: 'INVALID_REQUEST', message: 'major와 mid는 필수입니다' },
        });
      }
      try {
        const result = await submitResponse({
          itemId,
          userId: request.userId,
          major,
          mid,
          sub: sub ?? null,
        });
        return reply.send(result);
      } catch (err: any) {
        return reply.code(400).send({
          error: { code: 'INVALID_CATEGORY', message: err.message },
        });
      }
    },
  );
};

export default roundRoutes;
