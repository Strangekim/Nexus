// 폴더 서비스 레이어
import prisma from '../lib/prisma.js';

/** 프로젝트 내 폴더 목록 조회 */
async function findByProject(projectId: string) {
  return prisma.folder.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

/** 폴더 단건 조회 */
async function findById(id: string) {
  return prisma.folder.findUnique({ where: { id } });
}

/** 폴더 생성 (프로젝트 내 이름 중복 검사 포함) */
async function create(projectId: string, dto: { name: string; description?: string }) {
  // 중복 검사
  const exists = await prisma.folder.findUnique({
    where: { projectId_name: { projectId, name: dto.name } },
  });
  if (exists) {
    throw Object.assign(new Error('같은 프로젝트 내에 동일한 폴더명이 존재합니다'), { statusCode: 409 });
  }
  return prisma.folder.create({ data: { projectId, ...dto } });
}

/** 폴더 수정 */
async function update(id: string, dto: { name?: string; description?: string }) {
  return prisma.folder.update({ where: { id }, data: dto });
}

/** 폴더 삭제 */
async function remove(id: string) {
  return prisma.folder.delete({ where: { id } });
}

export const folderService = { findByProject, findById, create, update, remove };
