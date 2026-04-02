// 메시지 저장 서비스
import prisma from '../lib/prisma.js';

/** 메시지 목록 조회 (페이지네이션) */
async function findBySession(sessionId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.message.findMany({
      where: { sessionId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.message.count({ where: { sessionId } }),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** 사용자 메시지 저장 */
async function saveUserMessage(sessionId: string, userId: string, content: string) {
  return prisma.message.create({
    data: { sessionId, userId, role: 'user', type: 'text', content },
  });
}

/** AI 응답 메시지 저장 */
async function saveAssistantMessage(
  sessionId: string,
  content: string,
  metadata?: object,
  tokenCount?: number,
) {
  return prisma.message.create({
    data: {
      sessionId,
      role: 'assistant',
      type: 'text',
      content,
      metadata: metadata ?? undefined,
      tokenCount,
    },
  });
}

export const messageService = { findBySession, saveUserMessage, saveAssistantMessage };
