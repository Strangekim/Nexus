// 대시보드 라우트 — 프로젝트 활동, 통계, 파일변경, 사용량 API
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import prisma from '../../lib/prisma.js';
import { createHttpError } from '../../lib/errors.js';
import { memberService } from '../../services/member.service.js';

interface IdParams { id: string }
interface StatsQuery { period?: 'today' | 'week' | 'month' }

/** 기간 기준 시작 시각 계산 */
function getPeriodStart(period: string): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  // 기본: week (7일 전)
  const d = new Date(now);
  d.setDate(d.getDate() - 7);
  return d;
}

/** 프로젝트 존재 확인 및 멤버십 검증 */
async function assertProjectMember(projectId: string, userId: string) {
  const proj = await prisma.project.findUnique({ where: { id: projectId } });
  if (!proj) throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
  await memberService.assertProjectMember(projectId, userId);
  return proj;
}

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /:id/dashboard/activity — 현재 락 보유 세션 + 온라인 사용자
  fastify.get<{ Params: IdParams }>('/activity', {
    preHandler: [requireAuth],
  }, async (request) => {
    const { id } = request.params;
    await assertProjectMember(id, request.userId);

    // 현재 락 보유 중인 세션 조회
    const lockedSessions = await prisma.session.findMany({
      where: { projectId: id, lockedBy: { not: null } },
      select: {
        id: true,
        title: true,
        lockedAt: true,
        branchName: true,
        locker: { select: { id: true, name: true } },
        folder: { select: { id: true, name: true } },
      },
      orderBy: { lockedAt: 'desc' },
    });

    // 최근 1시간 이내 활동한 사용자 (메시지 기준)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMessages = await prisma.message.findMany({
      where: {
        session: { projectId: id },
        createdAt: { gte: oneHourAgo },
        user: { isNot: null },
      },
      select: { user: { select: { id: true, name: true } } },
      distinct: ['userId'],
    });
    const onlineUsers = recentMessages.map((m) => m.user).filter(Boolean);

    return { lockedSessions, onlineUsers };
  });

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
  }, async (request) => {
    const { id } = request.params;
    const period = request.query.period ?? 'week';
    await assertProjectMember(id, request.userId);

    const since = getPeriodStart(period);

    // 병렬로 집계 쿼리 실행
    const [commitCount, sessionCount, messageCount, commitsByDay] = await Promise.all([
      prisma.commit.count({ where: { projectId: id, createdAt: { gte: since } } }),
      prisma.session.count({ where: { projectId: id, createdAt: { gte: since } } }),
      prisma.message.count({ where: { session: { projectId: id }, createdAt: { gte: since } } }),
      // 일별 커밋 수 (raw 쿼리로 date_trunc 활용)
      prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count
        FROM commits
        WHERE project_id = ${id}::uuid
          AND created_at >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const dailyCommits = commitsByDay.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));

    return { period, commitCount, sessionCount, messageCount, dailyCommits };
  });

  // GET /:id/dashboard/file-changes — 파일별 변경 빈도
  fastify.get<{ Params: IdParams }>('/file-changes', {
    preHandler: [requireAuth],
  }, async (request) => {
    const { id } = request.params;
    await assertProjectMember(id, request.userId);

    // commits.filesChanged JSONB 배열에서 파일별 빈도 집계
    const commits = await prisma.commit.findMany({
      where: { projectId: id, filesChanged: { not: undefined } },
      select: { filesChanged: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const freq: Record<string, number> = {};
    for (const commit of commits) {
      const files = commit.filesChanged as string[] | null;
      if (!Array.isArray(files)) continue;
      for (const f of files) {
        freq[f] = (freq[f] ?? 0) + 1;
      }
    }

    // 빈도 내림차순 정렬 후 상위 50개
    const fileChanges = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([file, count]) => ({ file, count }));

    return { fileChanges };
  });

  // GET /:id/dashboard/usage — 사용자별 세션/메시지/비용 집계
  fastify.get<{ Params: IdParams }>('/usage', {
    preHandler: [requireAuth],
  }, async (request) => {
    const { id } = request.params;
    await assertProjectMember(id, request.userId);

    // 프로젝트 멤버 목록
    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      select: { user: { select: { id: true, name: true, email: true } } },
    });

    // 사용자별 세션 수, 메시지 수, 사용량 집계
    const usage = await Promise.all(
      members.map(async ({ user }) => {
        const [sessionCount, messageCount, usageAgg] = await Promise.all([
          prisma.session.count({ where: { projectId: id, createdBy: user.id } }),
          prisma.message.count({
            where: { session: { projectId: id }, userId: user.id },
          }),
          prisma.usageLog.aggregate({
            where: { userId: user.id, session: { projectId: id } },
            _sum: { durationMs: true, inputTokens: true, outputTokens: true, costUsd: true },
          }),
        ]);
        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          sessionCount,
          messageCount,
          totalDurationMs: usageAgg._sum.durationMs ?? 0,
          totalInputTokens: usageAgg._sum.inputTokens ?? 0,
          totalOutputTokens: usageAgg._sum.outputTokens ?? 0,
          totalCostUsd: usageAgg._sum.costUsd ? Number(usageAgg._sum.costUsd) : 0,
        };
      }),
    );

    return { usage };
  });
};

export default dashboardRoutes;
