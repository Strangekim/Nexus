// Skills 라우트 — CLAUDE.md 편집 + Skills 디렉토리 관리 (활성/비활성 토글)
import { FastifyPluginAsync } from 'fastify';
import { readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '../../plugins/auth.js';
import { memberService } from '../../services/member.service.js';
import { projectService } from '../../services/project.service.js';
import { skillsService } from '../../services/skills.service.js';
import { createHttpError } from '../../lib/errors.js';

interface IdParams { id: string }
interface IdNameParams { id: string; name: string }
interface WriteBody { content: string }
interface CreateSkillBody { name: string; description: string; content: string }
interface UpdateSkillBody { description: string; content: string }

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
        additionalProperties: false,
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

  // GET /:id/skills/list — 모든 스킬 목록 (활성 + 비활성)
  fastify.get<{ Params: IdParams }>('/:id/skills/list', {
    preHandler: [requireAuth],
    schema: { params: idParamsSchema },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    const skills = await skillsService.listSkills(repoPath);
    return { skills };
  });

  // GET /:id/skills/list/:name — 스킬 상세 조회
  fastify.get<{ Params: IdNameParams }>('/:id/skills/list/:name', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  }, async (request) => {
    const { id, name } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return skillsService.getSkill(repoPath, name);
  });

  // POST /:id/skills/list — 새 스킬 생성
  fastify.post<{ Params: IdParams; Body: CreateSkillBody }>('/:id/skills/list', {
    preHandler: [requireAuth],
    schema: {
      params: idParamsSchema,
      body: {
        type: 'object',
        required: ['name', 'description', 'content'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 200 },
          content: { type: 'string', maxLength: 100000 },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return skillsService.createSkill(repoPath, request.body.name, request.body.description, request.body.content);
  });

  // PUT /:id/skills/list/:name — 스킬 내용 수정
  fastify.put<{ Params: IdNameParams; Body: UpdateSkillBody }>('/:id/skills/list/:name', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
      body: {
        type: 'object',
        required: ['description', 'content'],
        additionalProperties: false,
        properties: {
          description: { type: 'string', maxLength: 200 },
          content: { type: 'string', maxLength: 100000 },
        },
      },
    },
  }, async (request) => {
    const { id, name } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return skillsService.updateSkill(repoPath, name, request.body.description, request.body.content);
  });

  // PATCH /:id/skills/list/:name/toggle — 스킬 활성/비활성 토글
  fastify.patch<{ Params: IdNameParams }>('/:id/skills/list/:name/toggle', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  }, async (request) => {
    const { id, name } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    return skillsService.toggleSkill(repoPath, name);
  });

  // DELETE /:id/skills/list/:name — 스킬 삭제
  fastify.delete<{ Params: IdNameParams }>('/:id/skills/list/:name', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
      },
    },
  }, async (request) => {
    const { id, name } = request.params;
    await memberService.assertProjectMember(id, request.userId);
    const repoPath = await getRepoPath(id);
    await skillsService.deleteSkill(repoPath, name);
    return { success: true };
  });
};

export default skillsRoutes;
