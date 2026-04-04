// 채팅 SSE 스트리밍 라우트 — POST /api/sessions/:id/chat
import { FastifyPluginAsync } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth } from '../../plugins/auth.js';
import { sessionService } from '../../services/session.service.js';
import { messageService } from '../../services/message.service.js';
import { claudeService } from '../../services/claude.service.js';
import { claudeAuthService } from '../../services/claude-auth.service.js';
import { handleChatStream } from './chat-stream.js';
import { lockService } from '../../services/lock.service.js';
import prisma from '../../lib/prisma.js';
import { chatRateLimit } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';

/** 요청 타입 정의 */
interface ChatParams { id: string }
interface ChatBody { message: string }

/**
 * claudeSessionId를 사용자별로 관리: "userId:claudeSessionId" 형태로 저장
 */
function parseClaudeSessionId(raw: string | null, currentUserId: string): {
  claudeId: string | null;
  prevUserId: string | null;
} {
  if (!raw) return { claudeId: null, prevUserId: null };
  const [storedUserId, claudeId] = raw.split(':');
  if (!claudeId) return { claudeId: null, prevUserId: null };
  if (storedUserId === currentUserId) return { claudeId, prevUserId: null };
  // 다른 사용자 → 세션 파일 복사 필요
  return { claudeId, prevUserId: storedUserId };
}

/**
 * 이전 사용자의 Claude 세션 파일을 현재 사용자의 config 디렉토리로 복사
 * 이를 통해 --resume으로 대화를 이어갈 수 있다.
 * 경로 형식: {configDir}/projects/{cwd-encoded}/{sessionId}.jsonl
 */
async function copyClaudeSession(
  claudeSessionId: string,
  prevUserId: string,
  currentUserId: string,
  cwd: string,
): Promise<boolean> {
  try {
    const prevConfigDir = claudeAuthService.getConfigDir(prevUserId);
    const currentConfigDir = claudeAuthService.getConfigDir(currentUserId);

    // cwd를 Claude 디렉토리명 형식으로 변환 (/ → -)
    const cwdEncoded = cwd.replace(/\//g, '-');

    const srcDir = path.join(prevConfigDir, 'projects', cwdEncoded);
    const destDir = path.join(currentConfigDir, 'projects', cwdEncoded);
    const fileName = `${claudeSessionId}.jsonl`;

    const srcPath = path.join(srcDir, fileName);
    const destPath = path.join(destDir, fileName);

    // 소스 파일 존재 확인
    await fs.access(srcPath);

    // 대상 디렉토리 생성
    await fs.mkdir(destDir, { recursive: true });

    // 파일 복사
    await fs.copyFile(srcPath, destPath);
    console.log(`[chat] Claude 세션 복사 완료: ${prevUserId} → ${currentUserId} (${claudeSessionId})`);
    return true;
  } catch (err) {
    console.warn(`[chat] Claude 세션 복사 실패 (무시):`, err);
    return false;
  }
}

const chatRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Params: ChatParams; Body: ChatBody }>('/:id/chat', {
    ...chatRateLimit,
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

    // OAuth 연동 여부 확인
    const creds = await claudeAuthService.getCredentials(userId);
    if (!creds) {
      return reply.code(403).send({
        error: { code: 'CLAUDE_NOT_CONNECTED', message: 'Claude 계정을 먼저 연동해주세요 (설정 > Claude 계정 연동).' },
      });
    }

    // 세션 존재 확인
    const session = await sessionService.findById(sessionId);
    if (!session) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다' } });
    }

    // 프로젝트 직속 세션(질의용)은 worktree 없이 프로젝트 repoPath를 사용
    const isQuerySession = !session.folderId && !session.worktreePath;

    // 채팅 시 자동 락 획득
    try {
      await lockService.acquireLock(sessionId, userId);
    } catch (lockErr) {
      const err = lockErr as Error & { statusCode?: number };
      return reply.code(err.statusCode ?? 500).send({
        error: {
          code: err.statusCode === 409 ? 'SESSION_LOCKED' : 'INTERNAL_ERROR',
          message: err.message,
        },
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
      'Access-Control-Allow-Origin': env.FRONTEND_URL,
      'Access-Control-Allow-Credentials': 'true',
    });

    // 프로젝트 정보 조회 (admin-only 여부 포함)
    const project = await prisma.project.findUnique({
      where: { id: session.projectId },
      select: { name: true, repoPath: true, isAdminOnly: true },
    }).catch(() => null);

    // admin-only 프로젝트는 글로벌 ~/.claude/ 사용 (CLI 세션 공유)
    const useGlobalConfig = project?.isAdminOnly ?? false;

    // cwd 결정: 폴더 세션 → worktree/dirName, 프로젝트 직속(질의) → repoPath
    let effectiveCwd: string;
    if (isQuerySession) {
      // 질의 세션 — 프로젝트 repo 루트에서 읽기 전용으로 동작
      effectiveCwd = project?.repoPath ?? '/tmp';
    } else if (session.folderId && session.worktreePath) {
      const folder = await prisma.folder.findUnique({
        where: { id: session.folderId },
        select: { dirName: true },
      });
      effectiveCwd = folder?.dirName
        ? path.join(session.worktreePath, folder.dirName)
        : session.worktreePath;
    } else {
      effectiveCwd = session.worktreePath!;
    }

    // admin-only 프로젝트: claudeSessionId를 그대로 사용 (userId prefix 없음)
    // 일반 프로젝트: userId:sessionId 형태로 파싱
    let resumeId: string | null;
    if (useGlobalConfig) {
      // admin-only — claudeSessionId에서 userId prefix가 있으면 제거
      const raw = session.claudeSessionId ?? null;
      resumeId = raw ? (raw.includes(':') ? raw.split(':')[1] : raw) : null;
    } else {
      const parsed = parseClaudeSessionId(session.claudeSessionId ?? null, userId);
      resumeId = parsed.claudeId;
      // 사용자 전환 시 이전 사용자의 세션 파일을 현재 사용자의 config에 복사
      if (parsed.prevUserId && resumeId) {
        await copyClaudeSession(resumeId, parsed.prevUserId, userId, effectiveCwd);
      }
    }

    // Claude CLI 실행
    const emitter = await claudeService.executeChat(
      sessionId,
      message,
      effectiveCwd,
      resumeId,
      userId,
      isQuerySession ? undefined : {
        projectName: project?.name ?? '알 수 없음',
        branchName: (session as { branchName?: string }).branchName,
      },
      useGlobalConfig,
    );

    await handleChatStream(emitter, reply, sessionId, {
      projectId: session.projectId,
      worktreePath: session.worktreePath,
      createdBy: session.createdBy,
      sessionTitle: session.title,
      projectName: project?.name ?? '',
      userId,
      useGlobalConfig,
    });
  });
};

export default chatRoute;
