// 프로젝트 서비스 레이어
import prisma from '../lib/prisma.js';

/** 프로젝트 목록 조회 (페이지네이션) */
async function findAll(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.project.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.project.count(),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/** 프로젝트 단건 조회 */
async function findById(id: string) {
  return prisma.project.findUnique({ where: { id } });
}

/** 프로젝트 생성 */
async function create(dto: { name: string; repoPath: string; description?: string }) {
  return prisma.project.create({ data: dto });
}

/** 프로젝트 수정 */
async function update(id: string, dto: { name?: string; description?: string }) {
  return prisma.project.update({ where: { id }, data: dto });
}

/** 프로젝트 삭제 */
async function remove(id: string) {
  return prisma.project.delete({ where: { id } });
}

export const projectService = { findAll, findById, create, update, remove };
