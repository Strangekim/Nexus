// Socket.IO 브로드캐스트 유틸 서비스 — 싱글턴 패턴
import type { Server as SocketIOServer } from 'socket.io';

/** emit 공통 페이로드 형식 */
interface EmitPayload<T = unknown> {
  data: T;
  timestamp: string;
}

/** 접속자 정보 */
interface OnlineUser {
  socketId: string;
  userId: string;
}

class SocketService {
  private io: SocketIOServer | null = null;

  /** Socket.IO 인스턴스 초기화 — index.ts에서 서버 시작 후 호출 */
  init(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * 초기화 여부 확인 — 내부 유틸
   * init() 전에 호출된 경우 에러를 throw하는 대신 null을 반환하여
   * emit 메서드들이 경고 로그 후 조기 반환할 수 있도록 한다
   */
  private getIO(): SocketIOServer | null {
    if (!this.io) {
      console.warn('[SocketService] 아직 초기화되지 않았습니다 — emit 스킵');
      return null;
    }
    return this.io;
  }

  /** 공통 페이로드 생성 */
  private buildPayload<T>(data: T): EmitPayload<T> {
    return { data, timestamp: new Date().toISOString() };
  }

  /**
   * 프로젝트 룸 브로드캐스트
   * @param projectId - 대상 프로젝트 ID
   * @param event - 소켓 이벤트명
   * @param data - 전송할 데이터
   */
  emitToProject<T>(projectId: string, event: string, data: T): void {
    const io = this.getIO();
    if (!io) return;
    io.to(`project:${projectId}`).emit(event, this.buildPayload(data));
  }

  /**
   * 세션 룸 브로드캐스트
   * @param sessionId - 대상 세션 ID
   * @param event - 소켓 이벤트명
   * @param data - 전송할 데이터
   */
  emitToSession<T>(sessionId: string, event: string, data: T): void {
    const io = this.getIO();
    if (!io) return;
    io.to(`session:${sessionId}`).emit(event, this.buildPayload(data));
  }

  /**
   * 특정 유저에게 emit — userId 기반 개인 룸 활용
   * @param userId - 대상 유저 ID
   * @param event - 소켓 이벤트명
   * @param data - 전송할 데이터
   */
  emitToUser<T>(userId: string, event: string, data: T): void {
    const io = this.getIO();
    if (!io) return;
    io.to(`user:${userId}`).emit(event, this.buildPayload(data));
  }

  /**
   * 프로젝트 룸 접속자 목록 반환
   * @param projectId - 대상 프로젝트 ID
   * @returns 접속 중인 소켓 ID 및 userId 목록
   */
  async getOnlineUsers(projectId: string): Promise<OnlineUser[]> {
    const io = this.getIO();
    // 초기화 전이면 빈 배열 반환
    if (!io) return [];
    const sockets = await io.in(`project:${projectId}`).fetchSockets();

    return sockets.map((s) => ({
      socketId: s.id,
      userId: (s.data as { userId: string }).userId,
    }));
  }
}

// 싱글턴 인스턴스 export
export const socketService = new SocketService();
