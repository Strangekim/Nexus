// 대시보드 라우트 — 프로젝트 활동, 통계, 파일변경, 사용량 API
// 핸들러 로직은 dashboard.handlers.ts로 분리됨
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import {
  handleActivity,
  handleStats,
  handleFileChanges,
  handleUsage,
} from './dashboard.handlers.js';

interface IdParams { id: string }
interface StatsQuery { period?: 'today' | 'week' | 'month' }

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /:id/dashboard/activity — 현재 락 보유 세션 + 온라인 사용자
  fastify.get<{ Params: IdParams }>('/activity', {
    preHandler: [requireAuth],
  }, handleActivity);

  // GET /:id/dashboard/stats — 기간별 커밋/세션/메시지 집계
  fastify.get<{ Params: IdParams; Querystring: StatsQuery }>('/stats', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'week', 'month'], default: 'week' },
        },
      },
    },
  }, handleStats);

  // GET /:id/dashboard/file-changes — 파일별 변경 빈도
  fastify.get<{ Params: IdParams }>('/file-changes', {
    preHandler: [requireAuth],
  }, handleFileChanges);

  // GET /:id/dashboard/usage — 사용자별 세션/메시지/비용 집계
  fastify.get<{ Params: IdParams }>('/usage', {
    preHandler: [requireAuth],
  }, handleUsage);
};

export default dashboardRoutes;
