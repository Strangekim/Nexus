// Skills 라우트 — CLAUDE.md / .claude/skills.md 읽기·쓰기 API
import { FastifyPluginAsync } from 'fastify';
import { readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { requireAuth } from '../../plugins/auth.js';
import { memberService } from '../../services/member.service.js';
import { projectService } from '../../services/project.service.js';
import { createHttpError } from '../../lib/errors.js';

interface IdParams { id: string }
interface WriteBody { content: string }

/** id params UUID 검증 스키마 */
const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', format: 'uuid' } },
};

/** 파일 읽기 — 미존재 시 빈 내용 반환 */
async function readFileOrEmpty(filePath: string) {
  try {
    const [content, info] = await Promise.all([
      readFile(filePath, 'utf-8'),
      stat(filePath),
    ]);
    return { content, lastModified: info.mtime.toISOString() };
  } catch (err: unknown) {
    // ENOENT(파일 없음)면 빈 내용 반환, 그 외는 에러
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { content: '', lastModified: null };
    }
    throw err;
  }
}

/** repoPath 조회 — 미존재 시 404 */
async function getRepoPath(projectId: string): Promise<string> {
  const project = await projectService.findById(projectId);
  if (!project) throw createHttpError(404, '프로젝트를 찾을 수 없습니다');
  return project.repoPath;
}

const skillsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /:id/skills/claude-md — CLAUDE.md 조회
  fastify.get<{ Params: IdParams }>('/:id/skills/claude-md', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return readFileOrEmpty(join(repoPath, 'CLAUDE.md'));
  });

  // PUT /:id/skills/claude-md — CLAUDE.md 저장
  fastify.put<{ Params: IdParams; Body: WriteBody }>('/:id/skills/claude-md', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        required: ['content'],
        // maxLength: 500KB 제한 — 지나치게 큰 파일 업로드 방지
        properties: { content: { type: 'string', maxLength: 500000 } },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    await writeFile(join(repoPath, 'CLAUDE.md'), request.body.content, 'utf-8');
    return { success: true };
  });

  // GET /:id/skills/skills-md — .claude/skills.md 조회
  fastify.get<{ Params: IdParams }>('/:id/skills/skills-md', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return readFileOrEmpty(join(repoPath, '.claude', 'skills.md'));
  });

  // PUT /:id/skills/skills-md — .claude/skills.md 저장
  fastify.put<{ Params: IdParams; Body: WriteBody }>('/:id/skills/skills-md', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        required: ['content'],
        // maxLength: 500KB 제한 — 지나치게 큰 파일 업로드 방지
        properties: { content: { type: 'string', maxLength: 500000 } },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    const skillsPath = join(repoPath, '.claude', 'skills.md');
    // .claude 디렉토리가 없으면 생성
    await mkdir(dirname(skillsPath), { recursive: true });
    await writeFile(skillsPath, request.body.content, 'utf-8');
    return { success: true };
  });
};

export default skillsRoutes;
