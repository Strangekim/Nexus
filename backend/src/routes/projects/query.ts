// PM 자연어 질의 라우트 — POST /api/projects/:id/query
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { pmQueryService } from '../../services/pm-query.service.js';
import { transformStreamEvent } from '../../services/sse-transformer.js';
import { createHttpError } from '../../lib/errors.js';
import { StreamEvent } from '../../services/claude.service.js';

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

    // SSE 헤더 설정
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let emitter;
    try {
      emitter = await pmQueryService.query(projectId, message, folderId);
    } catch {
      throw createHttpError(500, 'PM 질의 서비스 오류');
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
