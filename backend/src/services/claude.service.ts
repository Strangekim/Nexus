// Claude Code CLI 래핑 서비스 — 프로세스 관리 + stream-json 파싱
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

/** stream-json 이벤트 기본 타입 */
export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

class ClaudeService {
  /** 실행 중인 프로세스 관리 (세션ID → 프로세스) */
  private processes = new Map<string, ChildProcess>();

  /** CLI 실행 + stdout stream-json 파싱 */
  executeChat(
    sessionId: string,
    message: string,
    worktreePath: string,
    claudeSessionId?: string | null,
  ): EventEmitter {
    const emitter = new EventEmitter();

    // -- 구분자로 message를 위치 인자로 고정하여 CLI 인자 인젝션 방지
    // claudeSessionId에서 -- 시작 문자열 제거
    const safeClaudeSessionId = claudeSessionId?.replace(/^--/, '') ?? null;

    const args = ['--output-format', 'stream-json', '-p', '--', message];
    if (safeClaudeSessionId) {
      // --resume은 -- 구분자 앞에 위치해야 하므로 앞에 삽입
      args.splice(0, 0, '--resume', safeClaudeSessionId);
    }

    const proc = spawn('claude', args, {
      cwd: worktreePath,
      env: { ...process.env },
    });

    this.processes.set(sessionId, proc);

    let buffer = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line) as StreamEvent;
          emitter.emit('event', event);
        } catch {
          // JSON 파싱 실패 — 무시
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      emitter.emit('error', chunk.toString());
    });

    proc.on('close', (code) => {
      this.processes.delete(sessionId);
      // 버퍼에 남은 데이터 처리
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as StreamEvent;
          emitter.emit('event', event);
        } catch {
          // 무시
        }
      }
      emitter.emit('close', code);
    });

    return emitter;
  }

  /** CLI 프로세스 중단 */
  abort(sessionId: string): boolean {
    const proc = this.processes.get(sessionId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(sessionId);
      return true;
    }
    return false;
  }

  /** 특정 세션의 프로세스가 실행 중인지 확인 */
  isRunning(sessionId: string): boolean {
    return this.processes.has(sessionId);
  }
}

export const claudeService = new ClaudeService();
