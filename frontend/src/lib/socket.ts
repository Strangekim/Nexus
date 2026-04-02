// Socket.IO 클라이언트 싱글턴 — 앱 전체에서 단일 소켓 인스턴스 사용

import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/constants';

let socket: Socket | null = null;

/** 소켓 인스턴스 반환 — 없으면 생성 (연결은 하지 않음) */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      // 세션 쿠키 자동 전송
      withCredentials: true,
      // 로그인 후 수동으로 connect() 호출
      autoConnect: false,
      path: '/socket.io',
      // 재연결 설정
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

/** 소켓 연결 시작 — 로그인 성공 후 호출 */
export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

/** 소켓 연결 해제 + 인스턴스 초기화 — 로그아웃 시 호출 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
