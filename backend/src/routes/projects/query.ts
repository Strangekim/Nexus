// 팀 자연어 질의 라우트 — POST /api/projects/:id/query
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { pmQueryService } from '../../services/pm-query.service.js';
import { transformStreamEvent } from '../../services/sse-transformer.js';
import { createHttpError } from '../../lib/errors.js';
import { StreamEvent } from '../../services/claude.service.js';
import { memberService } from '../../services/member.service.js';
import { claudeAuthService } from '../../services/claude-auth.service.js';

interface Params { id: string }
interface Body { message: string; folderId?: string }

/** SSE 이벤트 전송 헬퍼 */
function sendSse(reply: import('fastify').FastifyReply, event: string, data: object) {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const queryRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: Params; Body: Body }>('/:id/query', {
    preHandler: [requireAuth],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 4000 },
          folderId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { id: projectId } = request.params;
    const { message, folderId } = request.body;
    const userId = request.userId;

    // SSE 헤더 전송 전 멤버십 검증 (헤더 write 이후엔 에러 응답 불가)
    await memberService.assertProjectMember(projectId, userId);

    // OAuth 연동 여부 확인 (credentials.json 존재 여부)
    const creds = await claudeAuthService.getCredentials(userId);
    if (!creds) {
      return reply.code(403).send({
        error: { code: 'CLAUDE_NOT_CONNECTED', message: 'Claude 계정을 먼저 연동해주세요 (설정 > Claude 계정 연동).' },
      });
    }

    // SSE 헤더 설정
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let emitter;
    try {
      // userId로 CLAUDE_CONFIG_DIR 결정 (OAuth 인증 사용)
      emitter = await pmQueryService.query(projectId, message, folderId, userId);
    } catch {
      throw createHttpError(500, '팀 질의 서비스 오류');
    }

    await new Promise<void>((resolve) => {
      emitter.on('event', (raw: StreamEvent) => {
        const sseEvents = transformStreamEvent(raw as Record<string, unknown>);
        for (const evt of sseEvents) {
          sendSse(reply, evt.event, evt.data);
        }
      });

      emitter.on('error', (errMsg: string) => {
        sendSse(reply, 'system', { subtype: 'error', message: errMsg });
        reply.raw.end();
        resolve();
      });

      emitter.on('close', () => {
        sendSse(reply, 'done', { projectId });
        reply.raw.end();
        resolve();
      });

      // 클라이언트 연결 끊김 시 정리
      reply.raw.on('close', () => {
        emitter.removeAllListeners();
        resolve();
      });
    });
  });
};

export default queryRoute;
