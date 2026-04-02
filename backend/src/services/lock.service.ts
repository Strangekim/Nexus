// 세션 락 비즈니스 로직 서비스
import prisma from '../lib/prisma.js';
import { createHttpError } from '../lib/errors.js';
import { socketService } from './socket.service.js';

/** 락 정보 형식 — 브로드캐스트 및 응답에 사용 */
export interface LockInfo {
  sessionId: string;
  lockedBy: string | null;
  lockedAt: string | null;
  lockerName: string | null;
}

/** 락 상태 브로드캐스트 헬퍼 */
async function broadcastLockUpdate(sessionId: string): Promise<LockInfo> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      lockedBy: true,
      lockedAt: true,
      locker: { select: { name: true } },
    },
  });

  const lockInfo: LockInfo = {
    sessionId,
    lockedBy: session?.lockedBy ?? null,
    lockedAt: session?.lockedAt?.toISOString() ?? null,
    lockerName: session?.locker?.name ?? null,
  };

  socketService.emitToSession(sessionId, 'session:lock-updated', lockInfo);
  return lockInfo;
}

class LockService {
  /**
   * 세션 락 획득 — 원자적 트랜잭션으로 처리
   * - 미잠금 → lockedBy, lockedAt, lastActivityAt 설정
   * - 이미 본인 → lastActivityAt만 갱신
   * - 다른 사용자 → 409 SESSION_LOCKED
   */
  async acquireLock(sessionId: string, userId: string): Promise<LockInfo> {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: { lockedBy: true },
      });

      if (!session) throw createHttpError(404, '세션을 찾을 수 없습니다');

      // 다른 사용자가 락 보유 중
      if (session.lockedBy && session.lockedBy !== userId) {
        throw createHttpError(409, '다른 사용자가 작업 중입니다');
      }

      const now = new Date();
      await tx.session.update({
        where: { id: sessionId },
        data: {
          lockedBy: userId,
          // 신규 락 획득 시에만 lockedAt 설정
          lockedAt: session.lockedBy === userId ? undefined : now,
          lastActivityAt: now,
        },
      });

      return broadcastLockUpdate(sessionId);
    });
  }

  /**
   * 세션 락 해제 — 본인 락만 해제 가능
   */
  async releaseLock(sessionId: string, userId: string): Promise<LockInfo> {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: { lockedBy: true },
      });

      if (!session) throw createHttpError(404, '세션을 찾을 수 없습니다');
      if (!session.lockedBy) return broadcastLockUpdate(sessionId); // 이미 미잠금
      if (session.lockedBy !== userId) {
        throw createHttpError(403, '본인 락만 해제할 수 있습니다');
      }

      await tx.session.update({
        where: { id: sessionId },
        data: { lockedBy: null, lockedAt: null, lastActivityAt: null },
      });

      return broadcastLockUpdate(sessionId);
    });
  }

  /**
   * 락 이전 — 트랜잭션으로 lockedBy 직접 교체 (중간 상태 없음)
   */
  async transferLock(
    sessionId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<LockInfo> {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        select: { lockedBy: true },
      });

      if (!session) throw createHttpError(404, '세션을 찾을 수 없습니다');
      if (session.lockedBy !== fromUserId) {
        throw createHttpError(403, '락 보유자만 이전할 수 있습니다');
      }

      // 수신자 존재 확인
      const toUser = await tx.user.findUnique({ where: { id: toUserId }, select: { id: true } });
      if (!toUser) throw createHttpError(404, '이전 대상 사용자를 찾을 수 없습니다');

      const now = new Date();
      await tx.session.update({
        where: { id: sessionId },
        data: { lockedBy: toUserId, lockedAt: now, lastActivityAt: now },
      });

      return broadcastLockUpdate(sessionId);
    });
  }

  /**
   * 만료된 락 자동 해제 — lastActivityAt이 15분 초과된 세션
   */
  async checkExpiredLocks(): Promise<void> {
    const expiredAt = new Date(Date.now() - 15 * 60 * 1000);

    const expiredSessions = await prisma.session.findMany({
      where: {
        lockedBy: { not: null },
        lastActivityAt: { lt: expiredAt },
      },
      select: { id: true },
    });

    for (const { id } of expiredSessions) {
      await prisma.session.update({
        where: { id },
        data: { lockedBy: null, lockedAt: null, lastActivityAt: null },
      });
      await broadcastLockUpdate(id);
    }
  }

  /**
   * 서버 시작 시 모든 락 초기화 — 고스트 락 방지
   */
  async clearAllLocks(): Promise<void> {
    await prisma.session.updateMany({
      where: { lockedBy: { not: null } },
      data: { lockedBy: null, lockedAt: null, lastActivityAt: null },
    });
  }
}

export const lockService = new LockService();
