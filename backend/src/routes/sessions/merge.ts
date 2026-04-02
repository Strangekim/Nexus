// POST /api/sessions/:id/merge — conflict 상태 세션 merge 재시도
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { mergeService } from '../../services/merge.service.js';
import { commitSyncService } from '../../services/commit-sync.service.js';
import { socketService } from '../../services/socket.service.js';
import { removeWorktree } from '../../services/worktree.service.js';
import { createHttpError } from '../../lib/errors.js';
import prisma from '../../lib/prisma.js';

/** params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

const mergeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: { id: string } }>('/:id/merge', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    const { id } = request.params;
    const userId = request.userId;

    // 세션 + 프로젝트 조회
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        project: {
          include: { projectMembers: true },
          select: { id: true, repoPath: true, projectMembers: true },
        },
      },
    });
    if (!session) throw createHttpError(404, '세션을 찾을 수 없습니다');

    // 프로젝트 멤버 검증
    const isMember = session.project.projectMembers.some((m) => m.userId === userId);
    if (!isMember) throw createHttpError(403, '이 세션에 접근할 권한이 없습니다');

    // conflict 상태인 세션만 재시도 허용
    if (session.mergeStatus !== 'conflict') {
      throw createHttpError(400, 'conflict 상태인 세션만 merge를 재시도할 수 있습니다');
    }

    // merge 재시도
    const mergeResult = await mergeService.mergeSessionToMain(session, session.project);

    // merge 성공 시 worktree 제거 + 커밋 동기화
    if (mergeResult.status === 'merged' && session.worktreePath) {
      await removeWorktree(session.project.repoPath, session.worktreePath).catch((err) => {
        console.error(`[merge.route] worktree 제거 실패 (무시): ${err}`);
      });

      await commitSyncService.syncNewCommits(
        session.project.id,
        session.id,
        session.project.repoPath,
      ).catch((err) => {
        console.error(`[merge.route] merge 커밋 동기화 실패 (무시): ${err}`);
      });
    }

    // DB 업데이트
    const updated = await prisma.session.update({
      where: { id },
      data: {
        mergeStatus: mergeResult.status,
        ...(mergeResult.status === 'merged' ? { worktreePath: null } : {}),
      },
    });

    // WebSocket 브로드캐스트
    socketService.emitToProject(session.project.id, 'session:archived', {
      sessionId: id,
      mergeStatus: mergeResult.status,
    });

    return { mergeStatus: updated.mergeStatus };
  });
};

export default mergeRoute;
