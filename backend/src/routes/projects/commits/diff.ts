// 커밋 diff 조회 라우트 — GET /api/projects/:id/commits/:hash/diff
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../../plugins/auth.js';
import prisma from '../../../lib/prisma.js';
import { commitSyncService } from '../../../services/commit-sync.service.js';
import { createHttpError } from '../../../lib/errors.js';
import { memberService } from '../../../services/member.service.js';

/** 라우트 파라미터 타입 */
interface DiffParams { id: string; hash: string }

const commitDiffRoute: FastifyPluginAsync = async (fastify) => {
  // GET /:hash/diff — 특정 커밋의 파일별 diff 반환
  fastify.get<{ Params: DiffParams }>('/:hash/diff', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id', 'hash'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          hash: { type: 'string', minLength: 7, maxLength: 40 },
        },
      },
    },
  }, async (request) => {
    const { id: projectId, hash } = request.params;

    // 프로젝트 확인
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw createHttpError(404, '프로젝트를 찾을 수 없습니다');

    // 프로젝트 멤버십 검증
    await memberService.assertProjectMember(projectId, request.userId);

    // 커밋 존재 여부 확인
    const commit = await prisma.commit.findFirst({
      where: { projectId, hash: { startsWith: hash } },
    });
    if (!commit) throw createHttpError(404, '커밋을 찾을 수 없습니다');

    // diff 파싱 결과 반환
    const files = await commitSyncService.getCommitDiff(project.repoPath, commit.hash);

    return {
      hash: commit.hash,
      message: commit.message,
      author: commit.author,
      createdAt: commit.createdAt,
      additions: commit.additions,
      deletions: commit.deletions,
      files,
    };
  });
};

export default commitDiffRoute;
