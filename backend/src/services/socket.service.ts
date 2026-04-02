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

  /** 초기화 여부 확인 — 내부 유틸 */
  private getIO(): SocketIOServer {
    if (!this.io) throw new Error('SocketService가 초기화되지 않았습니다');
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
    this.getIO()
      .to(`project:${projectId}`)
      .emit(event, this.buildPayload(data));
  }

  /**
   * 세션 룸 브로드캐스트
   * @param sessionId - 대상 세션 ID
   * @param event - 소켓 이벤트명
   * @param data - 전송할 데이터
   */
  emitToSession<T>(sessionId: string, event: string, data: T): void {
    this.getIO()
      .to(`session:${sessionId}`)
      .emit(event, this.buildPayload(data));
  }

  /**
   * 특정 유저에게 emit — userId 기반 개인 룸 활용
   * @param userId - 대상 유저 ID
   * @param event - 소켓 이벤트명
   * @param data - 전송할 데이터
   */
  emitToUser<T>(userId: string, event: string, data: T): void {
    this.getIO()
      .to(`user:${userId}`)
      .emit(event, this.buildPayload(data));
  }

  /**
   * 프로젝트 룸 접속자 목록 반환
   * @param projectId - 대상 프로젝트 ID
   * @returns 접속 중인 소켓 ID 및 userId 목록
   */
  async getOnlineUsers(projectId: string): Promise<OnlineUser[]> {
    const io = this.getIO();
    const sockets = await io.in(`project:${projectId}`).fetchSockets();

    return sockets.map((s) => ({
      socketId: s.id,
      userId: (s.data as { userId: string }).userId,
    }));
  }
}

// 싱글턴 인스턴스 export
export const socketService = new SocketService();
