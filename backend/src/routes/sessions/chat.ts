// 채팅 SSE 스트리밍 라우트 — POST /api/sessions/:id/chat
import { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { sessionService } from '../../services/session.service.js';
import { messageService } from '../../services/message.service.js';
import { claudeService, StreamEvent } from '../../services/claude.service.js';
import { transformStreamEvent } from '../../services/sse-transformer.js';
import { handleChatStream } from './chat-stream.js';
import prisma from '../../lib/prisma.js';

/** 요청 타입 정의 */
interface ChatParams { id: string }
interface ChatBody { message: string }

const chatRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: ChatParams; Body: ChatBody }>('/:id/chat', {
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
        properties: { message: { type: 'string', minLength: 1, maxLength: 10000 } },
      },
    },
  }, async (request, reply) => {
    const userId = request.userId;
    const { id: sessionId } = request.params;
    const { message } = request.body;

    // 세션 존재 확인
    const session = await sessionService.findById(sessionId);
    if (!session) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' },
      });
    }

    // worktreePath 확인
    if (!session.worktreePath) {
      return reply.code(400).send({
        error: { code: 'BAD_REQUEST', message: '워크트리 경로가 설정되지 않았습니다' },
      });
    }

    // 원자적 락 획득: lockedBy가 null이거나 자기 자신인 경우에만 업데이트
    // 동시 요청 시 두 요청 모두 락을 획득하는 레이스 컨디션 방지
    const lockResult = await prisma.session.updateMany({
      where: {
        id: sessionId,
        OR: [
          { lockedBy: null },
          { lockedBy: userId },
        ],
      },
      data: {
        lockedBy: userId,
        lockedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    if (lockResult.count === 0) {
      return reply.code(409).send({
        error: { code: 'SESSION_LOCKED', message: '다른 사용자가 작업 중입니다' },
      });
    }

    // 사용자 메시지 저장
    await messageService.saveUserMessage(sessionId, userId, message);

    // SSE 헤더 설정
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Claude CLI 실행 및 스트림 처리
    const emitter = claudeService.executeChat(
      sessionId,
      message,
      session.worktreePath,
      session.claudeSessionId,
    );

    await handleChatStream(emitter, reply, sessionId);
  });
};

export default chatRoute;
