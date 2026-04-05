// 프로젝트 멤버 서비스 레이어
import prisma from '../lib/prisma.js';
import { createHttpError } from '../lib/errors.js';

/** 프로젝트 멤버 목록 조회 */
async function findByProject(projectId: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { joinedAt: 'desc' },
  });
  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

/** 멤버 추가 */
async function add(projectId: string, userId: string, role: string) {
  const exists = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (exists) {
    throw createHttpError(409, '이미 프로젝트에 참여 중인 사용자입니다');
  }
  await prisma.projectMember.create({ data: { projectId, userId, role } });
  return findByProject(projectId);
}

/** 멤버 역할 변경 */
async function changeRole(projectId: string, userId: string, role: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw createHttpError(404, '프로젝트 멤버를 찾을 수 없습니다');
  }
  await prisma.projectMember.update({ where: { id: member.id }, data: { role } });
}

/** 멤버 제거 */
async function remove(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw createHttpError(404, '프로젝트 멤버를 찾을 수 없습니다');
  }
  await prisma.projectMember.delete({ where: { id: member.id } });
}

/**
 * 프로젝트 접근 검증 — 관리자 또는 프로젝트 멤버만 통과
 * 관리자는 모든 프로젝트 접근 가능, 일반 유저는 ProjectMember 레코드 필요
 */
async function assertProjectMember(projectId: string, userId: string): Promise<void> {
  if (!userId) {
    throw createHttpError(401, '로그인이 필요합니다');
  }

  // 관리자 역할 확인 — 관리자는 모든 프로젝트 접근 가능
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) {
    throw createHttpError(401, '유효하지 않은 사용자입니다');
  }
  if (user.role === 'admin') return;

  // 프로젝트 존재 여부 + admin-only 확인
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { isAdminOnly: true },
  });
  if (!project) {
    throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
  }
  if (project.isAdminOnly) {
    throw createHttpError(403, '관리자 전용 프로젝트입니다');
  }

  // 일반 유저는 ProjectMember 레코드 필요
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw createHttpError(403, '프로젝트에 접근 권한이 없습니다');
  }
}

export const memberService = { findByProject, add, changeRole, remove, assertProjectMember };
