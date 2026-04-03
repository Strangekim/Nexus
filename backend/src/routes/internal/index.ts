// 내부 전용 API — localhost에서만 접근 가능 (Claude CLI 등 서버 내부 호출용)
import { FastifyPluginAsync } from 'fastify';
import { mergeService } from '../../services/merge.service.js';
import { commitSyncService } from '../../services/commit-sync.service.js';
import prisma from '../../lib/prisma.js';

const internalRoutes: FastifyPluginAsync = async (fastify) => {
  // 모든 내부 라우트에 localhost 검증 적용
  fastify.addHook('onRequest', async (request, reply) => {
    const ip = request.ip;
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (!isLocal) {
      return reply.code(403).send({
        error: { code: 'FORBIDDEN', message: '내부 API는 localhost에서만 접근 가능합니다' },
      });
    }
  });

  /** POST /:id/merge — main에 merge만 수행 (세션/worktree 유지, 계속 작업 가능) */
  fastify.post<{ Params: { id: string } }>('/:id/merge', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request) => {
    const { id } = request.params;

    // 세션 + 프로젝트 정보 조회
    const session = await prisma.session.findUnique({
      where: { id },
      include: { project: { select: { id: true, repoPath: true } } },
    });
    if (!session) {
      return { status: 'error', message: '세션을 찾을 수 없습니다' };
    }
    if (!session.branchName) {
      return { status: 'error', message: '브랜치 정보가 없는 세션입니다' };
    }

    // main에 merge (세션 상태는 변경하지 않음)
    const result = await mergeService.mergeSessionToMain(session, session.project);

    // merge 성공 시 커밋 동기화
    if (result.status === 'merged') {
      await prisma.session.update({
        where: { id },
        data: { mergeStatus: 'merged' },
      });

      await commitSyncService.syncNewCommits(
        session.project.id,
        session.id,
        session.project.repoPath,
      ).catch(() => null);
    }

    return {
      status: 'ok',
      mergeStatus: result.status,
      message: result.status === 'merged'
        ? 'main 브랜치에 성공적으로 merge되었습니다. 세션은 계속 활성 상태입니다.'
        : 'merge 충돌이 발생했습니다. 수동 해결이 필요합니다.',
    };
  });
};

export default internalRoutes;
