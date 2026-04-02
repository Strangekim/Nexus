// 채팅 SSE 스트림 처리 로직
import { FastifyReply } from 'fastify';
import { EventEmitter } from 'events';
import { StreamEvent } from '../../services/claude.service.js';
import { transformStreamEvent, SseEvent } from '../../services/sse-transformer.js';
import { messageService } from '../../services/message.service.js';
import prisma from '../../lib/prisma.js';

/** SSE 이벤트를 클라이언트로 전송 */
function sendSseEvent(reply: FastifyReply, event: string, data: object) {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** 스트림 이벤트 수집 및 SSE 전달 처리 */
export function handleChatStream(
  emitter: EventEmitter,
  reply: FastifyReply,
  sessionId: string,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let fullText = '';
    let claudeSessionId: string | null = null;
    let totalTokens = 0;
    const toolsUsed: string[] = [];

    emitter.on('event', (raw: StreamEvent) => {
      const sseEvents = transformStreamEvent(raw as Record<string, unknown>);

      for (const evt of sseEvents) {
        sendSseEvent(reply, evt.event, evt.data);

        // 텍스트 누적
        if (evt.event === 'assistant_text') {
          fullText += evt.data.content as string;
        }
        // 도구 이름 수집
        if (evt.event === 'tool_use_begin') {
          toolsUsed.push(evt.data.tool as string);
        }
      }

      // session_id 추출 — system(init), result 두 이벤트 모두에서 시도
      // Claude CLI는 첫 system 이벤트에서 session_id를 포함하기도 함
      const extractedId = (raw.session_id ?? raw.sessionId ?? null) as string | null;
      if (extractedId && !claudeSessionId) {
        claudeSessionId = extractedId;
      }

      // result 이벤트에서 토큰 수 추출
      if (raw.type === 'result') {
        totalTokens = (raw.total_tokens ?? raw.totalTokens ?? 0) as number;
      }
    });

    emitter.on('error', (errMsg: string) => {
      // emitter 에러 발생 시 클라이언트에 에러 이벤트 전송
      sendSseEvent(reply, 'system', { subtype: 'error', message: errMsg });
      reply.raw.end();
      resolve();
    });

    emitter.on('close', async () => {
      try {
        // AI 응답 메시지 저장
        if (fullText) {
          const metadata = toolsUsed.length > 0 ? { toolsUsed } : undefined;
          const saved = await messageService.saveAssistantMessage(
            sessionId, fullText, metadata, totalTokens || undefined,
          );

          // done 이벤트 전송
          sendSseEvent(reply, 'done', {
            messageId: saved.id,
            sessionId,
            totalTokens,
          });
        }

        // 세션 정보 업데이트 (claudeSessionId, lastActivityAt)
        const updateData: Record<string, unknown> = { lastActivityAt: new Date() };
        if (claudeSessionId) {
          updateData.claudeSessionId = claudeSessionId;
        }
        await prisma.session.update({
          where: { id: sessionId },
          data: updateData,
        });
      } catch (err) {
        // DB 저장 실패해도 SSE는 정상 종료 — unhandled rejection 방지
        console.error('메시지 저장 실패:', err);
      } finally {
        // 항상 SSE 스트림 종료 및 Promise 해결
        reply.raw.end();
        resolve();
      }
    });

    // 클라이언트 연결 끊김 처리
    reply.raw.on('close', () => {
      emitter.removeAllListeners();
    });
  });
}
