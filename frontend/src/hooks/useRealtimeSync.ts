// WebSocket 이벤트 → Zustand 스토어 매핑 훅
// 프로젝트/세션 룸 자동 join/leave 처리

'use client';

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useRealtimeStore } from '@/stores/realtimeStore';
import type { LockInfo, OnlineUser, Notification, SocketPayload } from '@/types/realtime';

interface UseRealtimeSyncOptions {
  /** 현재 프로젝트 ID — 변경 시 룸 재참가 */
  projectId?: string;
  /** 현재 세션 ID — 변경 시 룸 재참가 */
  sessionId?: string;
}

/** Socket.IO 이벤트를 구독하고 Zustand 스토어와 TanStack Query를 동기화 */
export function useRealtimeSync({ projectId, sessionId }: UseRealtimeSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { setLock, setOnlineUsers, addNotification } = useRealtimeStore();

  // 이벤트 핸들러 — 소켓 이벤트 → 스토어 업데이트
  const handleLockUpdated = useCallback(
    (payload: SocketPayload<{ sessionId: string; lock: LockInfo | null }>) => {
      setLock(payload.data.sessionId, payload.data.lock);
    },
    [setLock],
  );

  const handleOnlineUsers = useCallback(
    (payload: SocketPayload<{ projectId: string; users: OnlineUser[] }>) => {
      setOnlineUsers(payload.data.projectId, payload.data.users);
    },
    [setOnlineUsers],
  );

  const handleNewNotification = useCallback(
    (payload: SocketPayload<Notification>) => {
      addNotification(payload.data);
    },
    [addNotification],
  );

  const handleSessionCreated = useCallback(() => {
    // 세션 목록/트리 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['tree'] });
  }, [queryClient]);

  const handleSessionDeleted = useCallback(() => {
    // 세션 목록/트리 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['tree'] });
  }, [queryClient]);

  // 이벤트 구독/해제
  useEffect(() => {
    const socket = getSocket();

    socket.on('session:lock-updated', handleLockUpdated);
    socket.on('project:online-users', handleOnlineUsers);
    socket.on('notification:new', handleNewNotification);
    socket.on('session:created', handleSessionCreated);
    socket.on('session:deleted', handleSessionDeleted);

    return () => {
      socket.off('session:lock-updated', handleLockUpdated);
      socket.off('project:online-users', handleOnlineUsers);
      socket.off('notification:new', handleNewNotification);
      socket.off('session:created', handleSessionCreated);
      socket.off('session:deleted', handleSessionDeleted);
    };
  }, [handleLockUpdated, handleOnlineUsers, handleNewNotification, handleSessionCreated, handleSessionDeleted]);

  // 프로젝트 룸 자동 join/leave
  useEffect(() => {
    if (!projectId) return;

    const socket = getSocket();
    socket.emit('join:project', projectId);

    return () => {
      socket.emit('leave:project', projectId);
    };
  }, [projectId]);

  // 세션 룸 자동 join/leave
  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    socket.emit('join:session', sessionId);

    return () => {
      socket.emit('leave:session', sessionId);
    };
  }, [sessionId]);
}
