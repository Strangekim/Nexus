// 프로젝트별 Merge 직렬화 큐 — 동시 merge로 인한 index.lock 충돌 방지
import { Mutex } from 'async-mutex';

class MergeQueueService {
  /** 프로젝트 ID → Mutex 매핑 */
  private queues: Map<string, Mutex> = new Map();

  /** 프로젝트별 Mutex 조회 (없으면 생성) */
  private getQueue(projectId: string): Mutex {
    if (!this.queues.has(projectId)) {
      this.queues.set(projectId, new Mutex());
    }
    return this.queues.get(projectId)!;
  }

  /**
   * Mutex를 획득하고 fn을 직렬 실행한 뒤 해제
   * @param projectId 프로젝트 ID (큐 단위)
   * @param fn 직렬 실행할 merge 함수
   */
  async executeMerge<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
    const mutex = this.getQueue(projectId);
    const release = await mutex.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// 싱글턴 인스턴스 export
export const mergeQueueService = new MergeQueueService();
