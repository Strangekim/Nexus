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

    // claudeSessionId에서 -- 시작 문자열 제거 (인자 인젝션 방지)
    const safeClaudeSessionId = claudeSessionId?.replace(/^--/, '') ?? null;

    // message는 stdin으로 전달 — args에 직접 포함하면 셸 인젝션 위험이 있음
    // '--' 구분자 이후 위치 인자로 넘기는 방식 대신 stdin 파이프 사용
    const args = ['--output-format', 'stream-json', '-p'];
    if (safeClaudeSessionId) {
      // --resume은 다른 플래그 앞에 위치
      args.unshift('--resume', safeClaudeSessionId);
    }

    const proc = spawn('claude', args, {
      cwd: worktreePath,
      env: { ...process.env },
      // stdin을 pipe로 열어 message를 안전하게 전달
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // message를 stdin으로 쓰고 닫아 EOF 신호 전송
    proc.stdin.write(message, 'utf8');
    proc.stdin.end();

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
