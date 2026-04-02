// 프로젝트 멤버 라우트 — /api/projects/:projectId/members
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { memberService } from '../../services/member.service.js';
import prisma from '../../lib/prisma.js';

// 요청 타입 정의
interface ProjectParams { projectId: string }
interface MemberParams extends ProjectParams { userId: string }
interface AddBody { userId: string; role: string }
interface RoleBody { role: string }

/** projectId params UUID 검증 스키마 */
const projectParamsSchema = {
  type: 'object',
  required: ['projectId'],
  properties: {
    projectId: { type: 'string', format: 'uuid' },
  },
};

/** projectId + userId params UUID 검증 스키마 */
const memberParamsSchema = {
  type: 'object',
  required: ['projectId', 'userId'],
  properties: {
    projectId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
  },
};

/**
 * 요청자(requesterId)가 해당 프로젝트의 멤버인지 검증
 * 멤버가 아니면 403 에러를 throw
 */
async function assertProjectMember(projectId: string, requesterId: string): Promise<void> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: requesterId } },
  });
  if (!member) {
    throw Object.assign(
      new Error('이 프로젝트에 접근할 권한이 없습니다'),
      { statusCode: 403 },
    );
  }
}

/**
 * 요청자(requesterId)가 해당 프로젝트의 admin인지 검증
 * admin이 아니면 403 에러를 throw
 */
async function assertProjectAdmin(projectId: string, requesterId: string): Promise<void> {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: requesterId } },
  });
  if (!member || member.role !== 'admin') {
    throw Object.assign(
      new Error('이 작업은 프로젝트 관리자만 수행할 수 있습니다'),
      { statusCode: 403 },
    );
  }
}

const memberRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — 멤버 목록 조회
  fastify.get<{ Params: ProjectParams }>('/', {
    preHandler: [requireAuth],
    schema: { params: projectParamsSchema },
  }, async (request, reply) => {
    const requesterId = request.session.get('userId') as string;

    // 인가 검증: 프로젝트 멤버만 목록 조회 가능
    try {
      await assertProjectMember(request.params.projectId, requesterId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: 'FORBIDDEN', message: error.message },
      });
    }

    return memberService.findByProject(request.params.projectId);
  });

  // POST / — 멤버 추가 (admin 전용)
  fastify.post<{ Params: ProjectParams; Body: AddBody }>('/', {
    preHandler: [requireAuth],
    schema: {
      params: projectParamsSchema,
      body: {
        type: 'object',
        required: ['userId', 'role'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['admin', 'member'] },
        },
      },
    },
  }, async (request, reply) => {
    const requesterId = request.session.get('userId') as string;

    // 인가 검증: admin만 멤버 추가 가능
    try {
      await assertProjectAdmin(request.params.projectId, requesterId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: 'FORBIDDEN', message: error.message },
      });
    }

    try {
      const members = await memberService.add(
        request.params.projectId, request.body.userId, request.body.role,
      );
      return reply.code(201).send(members);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 409) {
        return reply.code(409).send({
          error: { code: 'CONFLICT', message: error.message },
        });
      }
      throw err;
    }
  });

  // PATCH /:userId — 멤버 역할 변경 (admin 전용)
  fastify.patch<{ Params: MemberParams; Body: RoleBody }>('/:userId', {
    preHandler: [requireAuth],
    schema: {
      params: memberParamsSchema,
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'member'] },
        },
      },
    },
  }, async (request, reply) => {
    const requesterId = request.session.get('userId') as string;

    // 인가 검증: admin만 역할 변경 가능
    try {
      await assertProjectAdmin(request.params.projectId, requesterId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: 'FORBIDDEN', message: error.message },
      });
    }

    try {
      await memberService.changeRole(
        request.params.projectId, request.params.userId, request.body.role,
      );
      return { success: true };
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: error.message },
        });
      }
      throw err;
    }
  });

  // DELETE /:userId — 멤버 제거 (admin 전용)
  fastify.delete<{ Params: MemberParams }>('/:userId', {
    preHandler: [requireAuth],
    schema: { params: memberParamsSchema },
  }, async (request, reply) => {
    const requesterId = request.session.get('userId') as string;

    // 인가 검증: admin만 멤버 제거 가능
    try {
      await assertProjectAdmin(request.params.projectId, requesterId);
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      return reply.code(error.statusCode ?? 500).send({
        error: { code: 'FORBIDDEN', message: error.message },
      });
    }

    try {
      await memberService.remove(request.params.projectId, request.params.userId);
      return reply.code(204).send();
    } catch (err: unknown) {
      const error = err as Error & { statusCode?: number };
      if (error.statusCode === 404) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: error.message },
        });
      }
      throw err;
    }
  });
};

export default memberRoutes;
