---
name: socketio-client
description: Socket.IO 클라이언트 React 훅 및 서버 설정 패턴
---
# Socket.IO 코드 패턴

## 서버 설정 (Fastify + Socket.IO)
```typescript
// lib/socket.ts
import { Server } from 'socket.io';
import { FastifyInstance } from 'fastify';

export function setupSocketIO(fastify: FastifyInstance) {
  const io = new Server(fastify.server, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    // 프로젝트 룸 참가
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    // 세션 룸 참가
    socket.on('join:session', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('disconnect', () => {
      // 정리 로직
    });
  });

  // fastify 인스턴스에 io 데코레이트
  fastify.decorate('io', io);
  return io;
}
```

## 서버에서 이벤트 발송
```typescript
// 서비스 레이어에서 io 인스턴스 사용
// 프로젝트 룸에 브로드캐스트
fastify.io.to(`project:${projectId}`).emit('session:lock-updated', {
  data: { sessionId, lockedBy, lockedAt },
  timestamp: new Date().toISOString(),
});

// 특정 사용자에게 알림
fastify.io.to(`user:${userId}`).emit('notification:new', {
  data: notification,
  timestamp: new Date().toISOString(),
});
```

## 클라이언트 소켓 인스턴스
```typescript
// lib/socket-client.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      withCredentials: true, // 세션 쿠키 전송
      autoConnect: false,    // 수동 연결
      path: '/socket.io',
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

## React 훅: 소켓 연결 관리
```typescript
// hooks/useSocket.ts
'use client';

import { useEffect } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket-client';

export function useSocket() {
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // 앱 레벨에서 관리 — 컴포넌트 언마운트 시 끊지 않음
    };
  }, []);

  return getSocket();
}
```

## React 훅: 이벤트 리스너
```typescript
// hooks/useSocketEvent.ts
'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket-client';

// 특정 이벤트를 구독하는 범용 훅
export function useSocketEvent<T>(
  event: string,
  handler: (data: T) => void,
) {
  useEffect(() => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
```

## React 훅: 프로젝트 룸 참가
```typescript
// hooks/useProjectRoom.ts
'use client';

import { useEffect } from 'react';
import { useSocket } from './useSocket';

export function useProjectRoom(projectId: string) {
  const socket = useSocket();

  useEffect(() => {
    if (!projectId) return;

    socket.emit('join:project', projectId);

    return () => {
      socket.emit('leave:project', projectId);
    };
  }, [socket, projectId]);
}
```

## 컴포넌트에서 사용
```tsx
// components/session/SessionPanel.tsx
'use client';

import { useCallback } from 'react';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { useProjectRoom } from '@/hooks/useProjectRoom';

export function SessionPanel({ projectId }: { projectId: string }) {
  useProjectRoom(projectId);

  // 락 상태 변경 이벤트 구독
  const handleLockUpdated = useCallback((payload: LockUpdatedPayload) => {
    // Zustand 스토어 업데이트 등
  }, []);

  useSocketEvent('session:lock-updated', handleLockUpdated);

  return <div>세션 패널</div>;
}
```

## 이벤트 페이로드 형식
```typescript
// types/socket.ts
interface SocketPayload<T> {
  data: T;
  timestamp: string; // ISO 8601
}

// 에러
interface SocketError {
  error: { code: string; message: string };
}
```

## 규칙
- 모든 주석은 한글로 작성
- 이벤트명: `도메인:액션` (kebab-case, 예: `session:lock-updated`)
- 페이로드: `{ data, timestamp }` 형식 통일
- `withCredentials: true`로 세션 쿠키 전송
- 클라이언트 훅은 `hooks/` 디렉토리에 배치
