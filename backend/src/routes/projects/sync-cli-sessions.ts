// CLI 세션 동기화 라우트 — 관리자 전용 프로젝트의 CLI 세션을 DB에 동기화

import { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../../plugins/auth.js';
import { discoverCliSessions } from '../../services/cli-session-sync.service.js';
import prisma from '../../lib/prisma.js';
import { createHttpError } from '../../lib/errors.js';

interface IdParams {
  id: string;
}

const syncCliSessionsRoute: FastifyPluginAsync = async (fastify) => {
  // POST /:id/sync-cli-sessions — CLI JSONL 세션 파일 탐색 후 DB 동기화
  fastify.post<{ Params: IdParams }>(
    '/:id/sync-cli-sessions',
    {
      preHandler: [requireAdmin],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request) => {
      const { id: projectId } = request.params;

      // 프로젝트 조회 및 관리자 전용 검증
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, repoPath: true, isAdminOnly: true },
      });
      if (!project) {
        throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
      }
      if (!project.isAdminOnly) {
        throw createHttpError(400, 'CLI 세션 동기화는 관리자 전용 프로젝트에서만 가능합니다');
      }

      // CLI 세션 파일 탐색
      const discovered = await discoverCliSessions(project.repoPath);

      // 기존 DB 세션의 claudeSessionId 목록 조회 (중복 방지)
      const existingSessions = await prisma.session.findMany({
        where: { projectId },
        select: { claudeSessionId: true },
      });
      const existingIds = new Set(
        existingSessions
          .map((s) => s.claudeSessionId)
          .filter(Boolean),
      );

      // 새로운 세션만 DB에 생성
      const synced: Array<{
        id: string;
        title: string;
        claudeSessionId: string | null;
      }> = [];

      for (const cli of discovered) {
        // claudeSessionId 형식: {adminUserId}:{cliSessionId}
        const fullId = `${request.userId}:${cli.claudeSessionId}`;

        // 이미 동기화된 세션인지 확인 (전체 ID 또는 CLI ID 부분 매칭)
        if (existingIds.has(fullId) || existingIds.has(cli.claudeSessionId)) {
          continue;
        }

        // 기존 세션 중 claudeSessionId에 해당 CLI ID가 포함된 경우도 중복 처리
        const alreadyExists = [...existingIds].some(
          (eid) => eid?.includes(cli.claudeSessionId),
        );
        if (alreadyExists) continue;

        const created = await prisma.session.create({
          data: {
            projectId,
            folderId: null,
            title: cli.title,
            claudeSessionId: fullId,
            status: 'active',
            createdBy: request.userId,
          },
          select: { id: true, title: true, claudeSessionId: true },
        });

        synced.push(created);
        existingIds.add(fullId);
      }

      return {
        discovered: discovered.length,
        synced: synced.length,
        sessions: synced,
      };
    },
  );
};

export default syncCliSessionsRoute;
