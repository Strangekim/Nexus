// 커밋 라우터 — 커밋 관련 하위 라우트를 집계
import { FastifyPluginAsync } from 'fastify';
import commitsIndexRoute from './index.js';
import commitDiffRoute from './diff.js';
import commitRevertRoute from './revert.js';

const commitsRouter: FastifyPluginAsync = async (fastify) => {
  // GET /api/projects/:id/commits
  await fastify.register(commitsIndexRoute);
  // GET /api/projects/:id/commits/:hash/diff
  await fastify.register(commitDiffRoute);
  // POST /api/projects/:id/commits/:hash/revert
  await fastify.register(commitRevertRoute);
};

export default commitsRouter;
