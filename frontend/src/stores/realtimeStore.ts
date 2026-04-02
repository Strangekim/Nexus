// 실시간 상태 스토어 — 세션 락, 온라인 사용자, 알림 관리

import { create } from 'zustand';
import type { LockInfo, OnlineUser, Notification } from '@/types/realtime';

/** 실시간 상태 인터페이스 */
interface RealtimeState {
  /** 세션 락 상태: sessionId → LockInfo */
  sessionLocks: Map<string, LockInfo>;
  /** 프로젝트별 온라인 사용자: projectId → OnlineUser[] */
  onlineUsers: Map<string, OnlineUser[]>;
  /** 알림 목록 (최신순) */
  notifications: Notification[];
  /** 미읽음 알림 수 */
  unreadCount: number;

  // 액션
  setLock: (sessionId: string, lock: LockInfo | null) => void;
  setOnlineUsers: (projectId: string, users: OnlineUser[]) => void;
  addNotification: (notif: Notification) => void;
  markAsRead: (notifId: string) => void;
  markAllAsRead: () => void;
}

/** 실시간 상태 전역 스토어 */
export const useRealtimeStore = create<RealtimeState>((set) => ({
  sessionLocks: new Map(),
  onlineUsers: new Map(),
  notifications: [],
  unreadCount: 0,

  /** 세션 락 상태 설정 — null이면 락 해제 */
  setLock: (sessionId, lock) =>
    set((state) => {
      const next = new Map(state.sessionLocks);
      if (lock === null) {
        next.delete(sessionId);
      } else {
        next.set(sessionId, lock);
      }
      return { sessionLocks: next };
    }),

  /** 프로젝트 온라인 사용자 목록 갱신 */
  setOnlineUsers: (projectId, users) =>
    set((state) => {
      const next = new Map(state.onlineUsers);
      next.set(projectId, users);
      return { onlineUsers: next };
    }),

  /** 새 알림 추가 — 최신순으로 앞에 삽입 */
  addNotification: (notif) =>
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  /** 특정 알림 읽음 처리 */
  markAsRead: (notifId) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === notifId ? { ...n, isRead: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      return { notifications, unreadCount };
    }),

  /** 전체 알림 읽음 처리 */
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
