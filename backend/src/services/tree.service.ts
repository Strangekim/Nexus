// 트리 조회 서비스 — 사이드바용 전체 트리
import prisma from '../lib/prisma.js';

/** 사용자 관계 select 옵션 */
const userSelect = { select: { id: true, name: true } } as const;

/** 프로젝트 > 폴더 > 세션 중첩 트리 조회 (관리자 전용 프로젝트 필터링) */
async function getTree(projectId?: string, userId?: string) {
  // 기본 필터: 특정 프로젝트 지정 시 해당 프로젝트만 조회
  const where: Record<string, unknown> = projectId ? { id: projectId } : {};

  // 비관리자인 경우 관리자 전용 프로젝트 제외
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== 'admin') {
      where.isAdminOnly = false;
    }
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      folders: {
        orderBy: { createdAt: 'desc' },
        include: {
          sessions: {
            orderBy: { createdAt: 'desc' },
            include: { locker: userSelect },
          },
        },
      },
      // 프로젝트 직속 세션 (folderId가 null인 세션)
      sessions: {
        where: { folderId: null },
        orderBy: { createdAt: 'desc' },
        include: { locker: userSelect },
      },
    },
  });

  // 응답 형식에 맞게 변환
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    type: 'project' as const,
    folders: p.folders.map((f) => ({
      id: f.id,
      name: f.name,
      type: 'folder' as const,
      sessions: f.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        lockedBy: s.locker,
        type: 'session' as const,
      })),
    })),
    // 프로젝트 직속 세션 (전반 논의/질문용)
    sessions: p.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      lockedBy: s.locker,
      type: 'session' as const,
    })),
  }));
}

export const treeService = { getTree };
