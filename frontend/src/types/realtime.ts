// 실시간 통신 관련 타입 정의

/** 세션 락 정보 */
export interface LockInfo {
  userId: string;
  userName: string;
  lockedAt: string; // ISO 8601
}

/** 온라인 사용자 정보 */
export interface OnlineUser {
  userId: string;
  userName: string;
  projectId: string;
}

/** 알림 타입 — snake_case 규칙 */
export type NotificationType =
  | 'lock_request'
  | 'lock_released'
  | 'task_complete'
  | 'mention';

/** 알림 정보 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

/** Socket.IO 이벤트 페이로드 공통 형식 */
export interface SocketPayload<T> {
  data: T;
  timestamp: string; // ISO 8601
}
