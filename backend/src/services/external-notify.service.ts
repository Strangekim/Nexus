/**
 * @module external-notify.service
 * @description 외부 알림 통합 서비스 — SMS(알리고) + WebSocket(브라우저 푸시 / 알림음) 동시 발송.
 *
 * 동작 흐름:
 *   1. 알림 발송 전 대상 유저의 알림 설정(notifySms, notifyBrowser, notifySound, phone)을 DB에서 조회.
 *   2. notifySms=true 이고 phone이 있는 경우에만 SMS 발송 시도.
 *      — SMS 설정(알리고 환경변수)이 없으면 smsService 내부에서 자동 skip됨.
 *   3. WebSocket으로 브라우저 클라이언트에 이벤트를 emit.
 *      — notifyBrowser, notifySound 값을 payload에 포함하여 클라이언트가 각 동작을 결정.
 *   4. 유저 조회 실패(DB 오류, 유저 없음) 시 알림을 조용히 skip — 핵심 기능에 영향 없음.
 *
 * 이벤트:
 *   - `session:task-complete`      — 작업 완료 시 해당 유저에게 emit
 *   - `session:permission-required` — Claude Code가 사용자 확인 요청 시 emit
 */
import prisma from '../lib/prisma.js';
import { smsService } from './sms.service.js';
import { socketService } from './socket.service.js';

/** session:task-complete WebSocket 이벤트 페이로드 */
interface TaskCompletePayload {
  /** 완료된 세션 ID */
  sessionId: string;
  /** 세션 제목 */
  sessionTitle: string;
  /** 소속 프로젝트 이름 */
  projectName: string;
}

/** session:permission-required WebSocket 이벤트 페이로드 */
interface PermissionRequiredPayload {
  /** 허가가 필요한 세션 ID */
  sessionId: string;
  /** 세션 제목 */
  sessionTitle: string;
}

class ExternalNotifyService {
  /**
   * 작업 완료 알림 발송 — SMS + WebSocket 동시 처리.
   *
   * 처리 순서:
   *   1. 유저 알림 설정 조회 (실패 시 skip)
   *   2. notifySms && phone → SMS 비동기 발송 (실패해도 계속 진행)
   *   3. WebSocket `session:task-complete` 이벤트 emit (notifyBrowser/notifySound 포함)
   *
   * @param userId      - 알림 수신 대상 유저 ID
   * @param sessionId   - 완료된 세션 ID
   * @param sessionTitle - 세션 제목 (알림 메시지에 포함)
   * @param projectName - 프로젝트 이름 (알림 메시지에 포함)
   */
  async notifyTaskComplete(
    userId: string,
    sessionId: string,
    sessionTitle: string,
    projectName: string,
  ): Promise<void> {
    // 유저의 알림 설정 조회 — 실패 시 null 반환하여 skip
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, notifySms: true, notifyBrowser: true, notifySound: true },
    }).catch(() => null);

    // 유저 조회 실패 또는 존재하지 않는 유저 → 알림 skip
    if (!user) return;

    const smsMsg = `[Nexus] "${projectName}" 프로젝트의 "${sessionTitle}" 작업이 완료되었습니다.`;

    // SMS 발송 — notifySms 활성화 + 전화번호 등록된 경우에만
    // 알리고 환경변수가 미설정이면 smsService.sendSms() 내부에서 자동 skip됨
    if (user.notifySms && user.phone) {
      smsService.sendSms(user.phone, smsMsg).catch((err) => {
        console.error('[ExternalNotify] SMS 발송 실패:', err);
      });
    }

    // WebSocket으로 브라우저에 작업 완료 이벤트 전송
    // notifyBrowser, notifySound 플래그를 포함하여 클라이언트가 각 동작을 독립적으로 결정
    const payload: TaskCompletePayload = { sessionId, sessionTitle, projectName };
    socketService.emitToUser(userId, 'session:task-complete', {
      ...payload,
      notifyBrowser: user.notifyBrowser,
      notifySound: user.notifySound,
    });
  }

  /**
   * 허가 요청 알림 발송 — Claude Code가 사용자 확인이 필요한 경우.
   *
   * 처리 순서:
   *   1. 유저 알림 설정 조회 (실패 시 skip)
   *   2. notifySms && phone → SMS 비동기 발송
   *   3. WebSocket `session:permission-required` 이벤트 emit
   *
   * @param userId      - 알림 수신 대상 유저 ID (세션 락 보유자 또는 세션 생성자)
   * @param sessionId   - 허가가 필요한 세션 ID
   * @param sessionTitle - 세션 제목 (알림 메시지에 포함)
   */
  async notifyPermissionRequired(
    userId: string,
    sessionId: string,
    sessionTitle: string,
  ): Promise<void> {
    // 유저의 알림 설정 조회 — 실패 시 null 반환하여 skip
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, notifySms: true, notifyBrowser: true, notifySound: true },
    }).catch(() => null);

    if (!user) return;

    const smsMsg = `[Nexus] "${sessionTitle}" 세션에서 허가가 필요합니다. Nexus를 확인해주세요.`;

    // SMS 발송 — notifySms 활성화 + 전화번호 등록된 경우에만
    if (user.notifySms && user.phone) {
      smsService.sendSms(user.phone, smsMsg).catch((err) => {
        console.error('[ExternalNotify] 허가 요청 SMS 발송 실패:', err);
      });
    }

    // WebSocket으로 브라우저에 허가 요청 이벤트 전송
    const payload: PermissionRequiredPayload = { sessionId, sessionTitle };
    socketService.emitToUser(userId, 'session:permission-required', {
      ...payload,
      notifyBrowser: user.notifyBrowser,
      notifySound: user.notifySound,
    });
  }
}

/** 앱 전역에서 공유하는 싱글턴 인스턴스 */
export const externalNotifyService = new ExternalNotifyService();
