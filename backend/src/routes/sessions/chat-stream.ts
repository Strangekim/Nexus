// 채팅 SSE 스트림 처리 로직
import { FastifyReply } from 'fastify';
import { EventEmitter } from 'events';
import { StreamEvent } from '../../services/claude.service.js';
import { transformStreamEvent, SseEvent } from '../../services/sse-transformer.js';
import { messageService } from '../../services/message.service.js';
import { commitSyncService } from '../../services/commit-sync.service.js';
import { externalNotifyService } from '../../services/external-notify.service.js';
import prisma from '../../lib/prisma.js';

/** SSE 이벤트를 클라이언트로 전송 */
function sendSseEvent(reply: FastifyReply, event: string, data: object) {
  reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** 커밋 동기화 및 외부 알림에 필요한 세션 컨텍스트 */
interface SessionContext {
  projectId: string;
  worktreePath: string | null;
  /** 세션 생성자 유저 ID — 작업 완료 외부 알림 발송 대상 */
  createdBy?: string | null;
  /** 세션 제목 — SMS/푸시 알림 메시지에 사용 */
  sessionTitle?: string;
  /** 프로젝트 이름 — SMS/푸시 알림 메시지에 사용 */
  projectName?: string;
  /** 현재 요청 사용자 ID — claude_session_id 저장 시 사용자별 구분 */
  userId?: string;
  /** 글로벌 config 모드 — admin-only 프로젝트에서 claudeSessionId를 prefix 없이 저장 */
  useGlobalConfig?: boolean;
}

/** 스트림 이벤트 수집 및 SSE 전달 처리 */
export function handleChatStream(
  emitter: EventEmitter,
  reply: FastifyReply,
  sessionId: string,
  sessionCtx?: SessionContext,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let fullText = '';
    let claudeSessionId: string | null = null;
    let totalTokens = 0;
    const toolsUsed: string[] = [];
    // 도구 사용 상세 기록 — 메시지 metadata에 저장하여 이후 표시에 활용
    const toolDetails: { toolId: string; tool: string; summary?: string; input?: Record<string, unknown>; output?: string; isError?: boolean }[] = [];

    emitter.on('event', (raw: StreamEvent) => {
      const sseEvents = transformStreamEvent(raw as Record<string, unknown>);

      for (const evt of sseEvents) {
        sendSseEvent(reply, evt.event, evt.data);

        // 텍스트 누적
        if (evt.event === 'assistant_text') {
          fullText += evt.data.content as string;
        }
        // 도구 사용 시작 — 이름 + 요약 수집
        if (evt.event === 'tool_use_begin') {
          toolsUsed.push(evt.data.tool as string);
          toolDetails.push({
            toolId: evt.data.toolId as string,
            tool: evt.data.tool as string,
            summary: evt.data.toolUseSummary as string | undefined,
          });
        }
        // 도구 입력 수집
        if (evt.event === 'tool_use_input') {
          const detail = toolDetails.find((t) => t.toolId === evt.data.toolId);
          if (detail) detail.input = evt.data.input as Record<string, unknown>;
        }
        // 도구 결과 수집
        if (evt.event === 'tool_result') {
          const detail = toolDetails.find((t) => t.toolId === evt.data.toolId);
          if (detail) {
            detail.output = evt.data.output as string;
            detail.isError = evt.data.isError as boolean;
          }
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
          const metadata = toolsUsed.length > 0
            ? { toolsUsed, toolDetails: toolDetails.length > 0 ? toolDetails : undefined }
            : undefined;
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

        // done 이후 외부 알림 발송 (SMS + 브라우저 푸시 + 알림음)
        if (sessionCtx?.createdBy && sessionCtx.sessionTitle && sessionCtx.projectName) {
          externalNotifyService.notifyTaskComplete(
            sessionCtx.createdBy,
            sessionId,
            sessionCtx.sessionTitle,
            sessionCtx.projectName,
          ).catch((err) => {
            console.error('외부 알림 발송 실패:', err);
          });
        }

        // done 이후 새 커밋 자동 동기화
        if (sessionCtx?.worktreePath) {
          commitSyncService.syncNewCommits(
            sessionCtx.projectId,
            sessionId,
            sessionCtx.worktreePath,
          ).catch((err) => {
            console.error('커밋 동기화 실패:', err);
          });
        }

        // 세션 정보 업데이트 (claudeSessionId, lastActivityAt)
        const updateData: Record<string, unknown> = { lastActivityAt: new Date() };
        if (claudeSessionId) {
          // admin-only(글로벌 config): prefix 없이 저장 — CLI와 동일한 세션 ID
          // 일반 프로젝트: "userId:claudeSessionId" 형태로 사용자별 구분
          if (sessionCtx?.useGlobalConfig) {
            updateData.claudeSessionId = claudeSessionId;
          } else if (sessionCtx?.userId) {
            updateData.claudeSessionId = `${sessionCtx.userId}:${claudeSessionId}`;
          } else {
            updateData.claudeSessionId = claudeSessionId;
          }
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
