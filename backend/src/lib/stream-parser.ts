// stream-json 파싱 공통 유틸 — stdout buffer + split + JSON.parse 로직 추출
import { EventEmitter } from 'events';
import type { StreamEvent } from '../services/claude.service.js';

/**
 * stdout 데이터 청크를 버퍼에 누적하고,
 * 줄 단위로 분리하여 JSON 파싱 후 emitter에 'event'로 emit한다.
 * 파싱 실패한 줄은 조용히 무시한다.
 *
 * @returns 남은 버퍼를 읽고 업데이트하는 setter — 클로저로 관리
 */
export function createStreamHandler(emitter: EventEmitter): {
  onData: (chunk: Buffer) => void;
  flush: () => void;
} {
  let buffer = '';

  /** 청크를 받아 버퍼에 누적하고 완성된 줄을 처리 */
  const onData = (chunk: Buffer): void => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    // 마지막 줄은 아직 완성되지 않은 데이터일 수 있으므로 버퍼에 유지
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamEvent;
        emitter.emit('event', event);
      } catch {
        // JSON 파싱 실패 — 무시
      }
    }
  };

  /** 프로세스 종료 시 남은 버퍼를 처리 */
  const flush = (): void => {
    if (!buffer.trim()) return;
    try {
      const event = JSON.parse(buffer) as StreamEvent;
      emitter.emit('event', event);
    } catch {
      // 무시
    }
    buffer = '';
  };

  return { onData, flush };
}
