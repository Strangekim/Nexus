// 알림 서비스 — DB 저장 + WebSocket 즉시 전달
import prisma from '../lib/prisma.js';
import { socketService } from './socket.service.js';
import type { Notification, Prisma } from '@prisma/client';

/** 지원하는 알림 타입 (snake_case) */
export type NotificationType =
  | 'lock_request'
  | 'lock_released'
  | 'task_complete'
  | 'mention';

class NotificationService {
  /**
   * 알림 생성 — DB에 저장 후 WebSocket으로 즉시 전달
   * @param userId - 수신 대상 유저 ID
   * @param type - 알림 타입
   * @param payload - 관련 정보 (sessionId, projectName 등)
   * @returns 생성된 알림 객체
   */
  async create(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<Notification> {
    // DB에 알림 레코드 생성 — payload를 Prisma InputJsonValue로 캐스팅
    const notif = await prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonValue, isRead: false },
    });

    // 실시간 전달 — 유저가 온라인이면 즉시 수신
    socketService.emitToUser(userId, 'notification:new', notif);

    return notif;
  }
}

// 싱글턴 인스턴스 export
export const notificationService = new NotificationService();
