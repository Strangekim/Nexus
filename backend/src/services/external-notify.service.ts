// 외부 알림 통합 서비스 — SMS + WebSocket(브라우저 푸시/알림음)
import prisma from '../lib/prisma.js';
import { smsService } from './sms.service.js';
import { socketService } from './socket.service.js';

/** task_complete WebSocket 이벤트 페이로드 */
interface TaskCompletePayload {
  sessionId: string;
  sessionTitle: string;
  projectName: string;
}

/** permission_required WebSocket 이벤트 페이로드 */
interface PermissionRequiredPayload {
  sessionId: string;
  sessionTitle: string;
}

class ExternalNotifyService {
  /**
   * 작업 완료 알림 — SMS + WebSocket 동시 발송
   * @param userId - 알림 수신 대상 유저 ID
   * @param sessionId - 완료된 세션 ID
   * @param sessionTitle - 세션 제목
   * @param projectName - 프로젝트 이름
   */
  async notifyTaskComplete(
    userId: string,
    sessionId: string,
    sessionTitle: string,
    projectName: string,
  ): Promise<void> {
    // 유저 알림 설정 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, notifySms: true, notifyBrowser: true, notifySound: true },
    }).catch(() => null);

    if (!user) return;

    const smsMsg = `[Nexus] "${projectName}" 프로젝트의 "${sessionTitle}" 작업이 완료되었습니다.`;

    // SMS 발송 — 설정 활성화 + 전화번호 있는 경우만
    if (user.notifySms && user.phone) {
      smsService.sendSms(user.phone, smsMsg).catch((err) => {
        console.error('[ExternalNotify] SMS 발송 실패:', err);
      });
    }

    // WebSocket으로 브라우저 푸시/알림음 트리거 이벤트 전송
    const payload: TaskCompletePayload = { sessionId, sessionTitle, projectName };
    socketService.emitToUser(userId, 'session:task-complete', {
      ...payload,
      notifyBrowser: user.notifyBrowser,
      notifySound: user.notifySound,
    });
  }

  /**
   * 허가 요청 알림 — SMS + WebSocket 발송
   * @param userId - 알림 수신 대상 유저 ID
   * @param sessionId - 허가가 필요한 세션 ID
   * @param sessionTitle - 세션 제목
   */
  async notifyPermissionRequired(
    userId: string,
    sessionId: string,
    sessionTitle: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, notifySms: true, notifyBrowser: true, notifySound: true },
    }).catch(() => null);

    if (!user) return;

    const smsMsg = `[Nexus] "${sessionTitle}" 세션에서 허가가 필요합니다. Nexus를 확인해주세요.`;

    if (user.notifySms && user.phone) {
      smsService.sendSms(user.phone, smsMsg).catch((err) => {
        console.error('[ExternalNotify] 허가 요청 SMS 발송 실패:', err);
      });
    }

    const payload: PermissionRequiredPayload = { sessionId, sessionTitle };
    socketService.emitToUser(userId, 'session:permission-required', {
      ...payload,
      notifyBrowser: user.notifyBrowser,
      notifySound: user.notifySound,
    });
  }
}

// 싱글턴 인스턴스 export
export const externalNotifyService = new ExternalNotifyService();
