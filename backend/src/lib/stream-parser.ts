/**
 * @module lib/stream-parser
 * @description Claude Code CLI의 `--output-format stream-json` 출력을 파싱하는 공통 유틸.
 *
 * Claude Code CLI는 stdout으로 JSON 객체를 한 줄씩 출력한다.
 * 네트워크/파이프 특성상 한 번의 `data` 이벤트에 여러 줄이 올 수도 있고,
 * 한 줄이 여러 청크로 분할되어 올 수도 있다.
 * 이 모듈은 그 불완전한 청크들을 버퍼에 누적하고 완성된 줄 단위로 JSON 파싱하여
 * EventEmitter의 `event` 이벤트로 emit한다.
 *
 * 사용 방법:
 * ```ts
 * import { createStreamHandler } from '../lib/stream-parser.js';
 * import { EventEmitter } from 'events';
 *
 * const emitter = new EventEmitter();
 * const { onData, flush } = createStreamHandler(emitter);
 *
 * emitter.on('event', (event) => {
 *   // stream-json 이벤트 처리
 * });
 *
 * process.stdout.on('data', onData);
 * process.on('close', () => { flush(); });
 * ```
 */
import { EventEmitter } from 'events';
import type { StreamEvent } from '../services/claude.service.js';

/**
 * stdout 데이터 청크를 버퍼에 누적하고,
 * 줄 단위로 분리하여 JSON 파싱 후 emitter에 `event`로 emit한다.
 * 파싱 실패한 줄(예: stderr 섞임, 빈 줄)은 조용히 무시한다.
 *
 * @param emitter - 파싱된 StreamEvent를 `event`로 emit할 EventEmitter 인스턴스
 * @returns `onData` (청크 수신 핸들러)와 `flush` (프로세스 종료 시 잔여 버퍼 처리) 함수 쌍
 */
export function createStreamHandler(emitter: EventEmitter): {
  onData: (chunk: Buffer) => void;
  flush: () => void;
} {
  /** 아직 완성되지 않은 줄을 임시 보관하는 문자열 버퍼 */
  let buffer = '';

  /**
   * 프로세스 stdout의 `data` 이벤트 핸들러.
   * 청크를 버퍼에 이어 붙인 뒤, 완성된 줄(`\n` 기준)만 JSON 파싱한다.
   * 마지막 줄(줄바꿈 없는 불완전한 줄)은 다음 청크를 기다리기 위해 버퍼에 유지한다.
   */
  const onData = (chunk: Buffer): void => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    // 마지막 요소는 아직 완성되지 않은 줄 — 다음 청크와 합쳐지도록 버퍼에 남김
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      // 빈 줄 skip
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StreamEvent;
        emitter.emit('event', event);
      } catch {
        // JSON이 아닌 줄(경고 메시지 등)은 무시하고 계속 진행
      }
    }
  };

  /**
   * 프로세스 종료(`close` 이벤트) 시 호출.
   * 버퍼에 남아 있는 마지막 줄을 파싱하여 처리한다.
   * 이 단계를 생략하면 마지막 이벤트가 유실될 수 있다.
   */
  const flush = (): void => {
    if (!buffer.trim()) return;
    try {
      const event = JSON.parse(buffer) as StreamEvent;
      emitter.emit('event', event);
    } catch {
      // 불완전한 JSON이면 무시
    }
    buffer = '';
  };

  return { onData, flush };
}
