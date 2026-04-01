// 프로젝트 멤버 라우트 — /api/projects/:projectId/members
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { memberService } from '../../services/member.service.js';

// 요청 타입 정의
interface ProjectParams { projectId: string }
interface MemberParams extends ProjectParams { userId: string }
interface AddBody { userId: string; role: string }
interface RoleBody { role: string }

const memberRoutes: FastifyPluginAsync = async (fastify) => {
  // GET / — 멤버 목록 조회
  fastify.get<{ Params: ProjectParams }>('/', {
    preHandler: [requireAuth],
  }, async (request) => {
    return memberService.findByProject(request.params.projectId);
  });

  // POST / — 멤버 추가
  fastify.post<{ Params: ProjectParams; Body: AddBody }>('/', {
    preHandler: [requireAuth],
    schema: {
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

  // PATCH /:userId — 멤버 역할 변경
  fastify.patch<{ Params: MemberParams; Body: RoleBody }>('/:userId', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'member'] },
        },
      },
    },
  }, async (request, reply) => {
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

  // DELETE /:userId — 멤버 제거
  fastify.delete<{ Params: MemberParams }>('/:userId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
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
