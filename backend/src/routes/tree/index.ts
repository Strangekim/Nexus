// 트리 라우트 — /api/tree
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { treeService } from '../../services/tree.service.js';
import { fileService } from '../../services/file.service.js';
import prisma from '../../lib/prisma.js';

// 요청 타입 정의
interface TreeQuery { projectId?: string }
interface FileQuery { path: string; projectId: string }
interface FileSaveBody { path: string; content: string; projectId: string }
interface BrowseQuery { path?: string; projectId: string }

const treeRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — 프로젝트 > 폴더 > 세션 중첩 트리
  fastify.get<{ Querystring: TreeQuery }>('/', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request) => {
    // 비관리자에게 관리자 전용 프로젝트를 숨기기 위해 userId 전달
    const tree = await treeService.getTree(request.query.projectId, request.userId);
    return { tree };
  });

  // GET /file — 파일 내용 읽기 (코드 뷰어용)
  fastify.get<{ Querystring: FileQuery }>('/file', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['path', 'projectId'],
        properties: {
          path: { type: 'string', minLength: 1 },
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { path, projectId } = request.query;
      const userId = request.userId;

      // 프로젝트 멤버십 확인 — 멤버가 아니면 403 반환
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!member) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '프로젝트 접근 권한이 없습니다' } });
      }

      const result = await fileService.readFile(projectId, path);
      return result;
    } catch (err: unknown) {
      const error = err as { code?: string; statusCode?: number; message?: string };
      const statusCode = error.statusCode ?? 500;
      const code = error.code ?? 'INTERNAL_ERROR';
      const message = error.message ?? '파일을 읽는 중 오류가 발생했습니다';
      return reply.code(statusCode).send({ error: { code, message } });
    }
  });
  // GET /browse — 디렉토리 내용 목록 조회 (파일 탐색기용)
  fastify.get<{ Querystring: BrowseQuery }>('/browse', {
    preHandler: [requireAuth],
    schema: {
      querystring: {
        type: 'object',
        required: ['projectId'],
        properties: {
          path: { type: 'string' },
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { path: dirPath = '', projectId } = request.query;
      const userId = request.userId;

      // 프로젝트 멤버십 확인
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!member) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '프로젝트 접근 권한이 없습니다' } });
      }

      const result = await fileService.browseDirectory(projectId, dirPath);
      return result;
    } catch (err: unknown) {
      const error = err as { code?: string; statusCode?: number; message?: string };
      const statusCode = error.statusCode ?? 500;
      const code = error.code ?? 'INTERNAL_ERROR';
      const message = error.message ?? '디렉토리를 조회하는 중 오류가 발생했습니다';
      return reply.code(statusCode).send({ error: { code, message } });
    }
  });

  // PUT /file — 파일 내용 저장 (코드 에디터용)
  fastify.put<{ Body: FileSaveBody }>('/file', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['path', 'content', 'projectId'],
        properties: {
          path: { type: 'string', minLength: 1 },
          content: { type: 'string', maxLength: 5 * 1024 * 1024 },
          projectId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { path: filePath, content, projectId } = request.body;
      const userId = request.userId;

      // 프로젝트 멤버십 확인 — 멤버가 아니면 403 반환
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (!member) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '프로젝트 접근 권한이 없습니다' } });
      }

      // 관리자 전용 프로젝트: 관리자 권한 확인
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { isAdminOnly: true },
      });
      if (project?.isAdminOnly && member.role !== 'admin') {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: '관리자 전용 프로젝트입니다' } });
      }

      const result = await fileService.saveFile(projectId, filePath, content);
      return result;
    } catch (err: unknown) {
      const error = err as { code?: string; statusCode?: number; message?: string };
      const statusCode = error.statusCode ?? 500;
      const code = error.code ?? 'INTERNAL_ERROR';
      const message = error.message ?? '파일을 저장하는 중 오류가 발생했습니다';
      return reply.code(statusCode).send({ error: { code, message } });
    }
  });
};

export default treeRoutes;
