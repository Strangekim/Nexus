// 세션 서비스 레이어
import prisma from '../lib/prisma.js';
import path from 'path';
import { createHttpError } from '../lib/errors.js';
import { createWorktree, removeWorktree } from './worktree.service.js';

/**
 * repoPath에 경로 트래버설 시도(`..`)가 포함되어 있는지 검증
 * 정규화 전 원본 경로 세그먼트 기준으로 검사
 */
function validateRepoPath(repoPath: string): void {
  // 경로 세그먼트 단위로 '..' 포함 여부 확인
  const segments = repoPath.split(path.sep).concat(repoPath.split('/'));
  if (segments.some((seg) => seg === '..')) {
    throw createHttpError(400, 'repoPath에 허용되지 않은 경로 세그먼트가 포함되어 있습니다');
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
  // 트랜잭션 외부에서 검증 먼저 수행 (읽기 전용 조회이므로 트랜잭션 불필요)
  const project = await prisma.project.findUnique({
    where: { id: dto.projectId },
    select: { repoPath: true },
  });
  if (!project) {
    throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
  }

  // folderId가 있으면 해당 폴더가 이 프로젝트 소속인지 검증
  if (dto.folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: dto.folderId } });
    if (!folder || folder.projectId !== dto.projectId) {
      throw createHttpError(404, '폴더를 찾을 수 없습니다');
    }
  }

  // 프로젝트 직속 세션은 worktree 없이 DB 생성만 수행
  if (!dto.folderId) {
    return prisma.session.create({
      data: {
        projectId: dto.projectId,
        folderId: null,
        title: dto.title,
        createdBy: dto.createdBy,
      },
      include: { creator: userSelect, locker: userSelect },
    });
  }

  // repoPath 경로 트래버설 방지 검증
  validateRepoPath(project.repoPath);

  // DB에 세션 먼저 생성하여 sessionId 확보
  const session = await prisma.session.create({
    data: {
      projectId: dto.projectId,
      folderId: dto.folderId,
      title: dto.title,
      createdBy: dto.createdBy,
    },
  });

  const branchName = `session/${session.id}`;
  let worktreePath: string;

  try {
    // 실제 git worktree 생성
    worktreePath = await createWorktree(project.repoPath, session.id, branchName);
  } catch (err) {
    // worktree 생성 실패 시 DB 롤백 (세션 삭제)
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    throw err;
  }

  // worktree 경로와 브랜치명을 DB에 업데이트
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

/** 세션 삭제 — worktree가 있으면 먼저 제거 후 DB 삭제 */
async function remove(id: string) {
  const session = await prisma.session.findUnique({
    where: { id },
    select: { worktreePath: true, project: { select: { repoPath: true } } },
  });

  if (session?.worktreePath && session.project.repoPath) {
    // DB 삭제 전에 worktree 제거 (실패해도 DB 삭제는 진행)
    await removeWorktree(session.project.repoPath, session.worktreePath).catch((err) => {
      console.error(`[session.remove] worktree 제거 실패 (무시): ${err}`);
    });
  }

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
