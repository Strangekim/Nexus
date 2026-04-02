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
 * 프로젝트 멤버십 검증 — 멤버가 아니면 403 에러를 throw
 * 시스템 admin(role='admin')은 모든 프로젝트에 접근 가능 (bypass)
 */
async function assertProjectMember(projectId: string, userId: string): Promise<void> {
  // 시스템 관리자는 모든 프로젝트에 접근 가능
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'admin') return;

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) {
    throw createHttpError(403, '해당 프로젝트의 멤버가 아닙니다');
  }
}

export const memberService = { findByProject, add, changeRole, remove, assertProjectMember };
