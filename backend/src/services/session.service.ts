// 세션 서비스 레이어
import prisma from '../lib/prisma.js';
import path from 'path';

/** worktree 기본 경로 — 이 경로 밖으로 벗어나는 경로 생성은 금지 */
const WORKTREE_BASE_PATH = '/home/ubuntu/projects-wt';

/**
 * worktreePath가 허용된 base 경로 내에 있는지 검증
 * 경로 트래버설 공격 방지
 */
function validateWorktreePath(worktreePath: string): void {
  const resolved = path.resolve(worktreePath);
  if (!resolved.startsWith(WORKTREE_BASE_PATH + '/') && resolved !== WORKTREE_BASE_PATH) {
    throw Object.assign(
      new Error('허용되지 않은 worktree 경로입니다'),
      { statusCode: 400 },
    );
  }
}

/** 사용자 관계 select 옵션 */
const userSelect = { select: { id: true, name: true } } as const;

/** 폴더별 세션 목록 조회 (선택적 status 필터) */
async function findByFolder(folderId: string, status?: string) {
  return prisma.session.findMany({
    where: { folderId, ...(status ? { status } : {}) },
    include: { creator: userSelect, locker: userSelect },
    orderBy: { createdAt: 'desc' },
  });
}

/** 세션 단건 조회 (관계 포함) */
async function findById(id: string) {
  return prisma.session.findUnique({
    where: { id },
    include: { creator: userSelect, locker: userSelect },
  });
}

/** 세션 생성 — folderId 있으면 폴더 소속, 없으면 프로젝트 직속 */
async function create(dto: {
  projectId: string;
  folderId?: string;
  title: string;
  createdBy: string;
}) {
  // 프로젝트 존재 확인 (repoPath 필요)
  const project = await prisma.project.findUnique({
    where: { id: dto.projectId },
    select: { repoPath: true },
  });
  if (!project) {
    throw Object.assign(new Error('프로젝트를 찾을 수 없습니다'), { statusCode: 404 });
  }

  // folderId가 있으면 해당 폴더가 이 프로젝트 소속인지 검증
  if (dto.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: dto.folderId } });
    if (!folder || folder.projectId !== dto.projectId) {
      throw Object.assign(new Error('폴더를 찾을 수 없습니다'), { statusCode: 404 });
    }
  }

  const session = await prisma.session.create({
    data: {
      projectId: dto.projectId,
      folderId: dto.folderId ?? null,
      title: dto.title,
      createdBy: dto.createdBy,
    },
  });

  // 프로젝트 직속 세션은 worktree 없이 생성 (전반 논의용)
  if (!dto.folderId) {
    return prisma.session.findUnique({
      where: { id: session.id },
      include: { creator: userSelect, locker: userSelect },
    });
  }

  const rawWorktreePath = project.repoPath.replace('/projects/', '/projects-wt/') + `/${session.id}/`;
  validateWorktreePath(rawWorktreePath);
  const worktreePath = path.resolve(rawWorktreePath);
  const branchName = `session/${session.id}`;

  return prisma.session.update({
    where: { id: session.id },
    data: { worktreePath, branchName },
    include: { creator: userSelect, locker: userSelect },
  });
}

/** 세션 수정 */
async function update(id: string, dto: { title?: string; status?: string }) {
  return prisma.session.update({
    where: { id },
    data: dto,
    include: { creator: userSelect, locker: userSelect },
  });
}

/** 세션 삭제 */
async function remove(id: string) {
  return prisma.session.delete({ where: { id } });
}

/** 프로젝트 직속 세션 목록 조회 (folderId가 null인 세션) */
async function findByProject(projectId: string, status?: string) {
  return prisma.session.findMany({
    where: { projectId, folderId: null, ...(status ? { status } : {}) },
    include: { creator: userSelect, locker: userSelect },
    orderBy: { createdAt: 'desc' },
  });
}

export const sessionService = { findByFolder, findByProject, findById, create, update, remove };
