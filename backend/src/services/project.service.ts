// 프로젝트 서비스 레이어
import prisma from '../lib/prisma.js';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';

/** 프로젝트 git 저장소 루트 경로 */
const PROJECTS_BASE = '/home/ubuntu/projects';

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

/**
 * 프로젝트 생성 — git 저장소 자동 초기화
 * 1. /home/ubuntu/projects/{프로젝트명}/ 디렉토리 생성
 * 2. git init + 초기 커밋
 * 3. DB에 프로젝트 + repoPath 저장
 */
async function create(dto: { name: string; description?: string }) {
  // 프로젝트명에서 안전한 디렉토리명 생성 (특수문자 제거)
  const safeName = dto.name
    .replace(/[^a-zA-Z0-9가-힣\s-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const repoPath = path.join(PROJECTS_BASE, safeName);

  // 디렉토리 생성
  await fs.mkdir(repoPath, { recursive: true });

  // git init + 초기 커밋
  const git = simpleGit(repoPath);
  await git.init();
  await git.raw(['commit', '--allow-empty', '-m', `프로젝트 "${dto.name}" 초기화`]);

  // DB 저장
  return prisma.project.create({
    data: { name: dto.name, repoPath, description: dto.description },
  });
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
