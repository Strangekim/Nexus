// Claude Code CLI 래핑 서비스 — 프로세스 관리 + stream-json 파싱
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createStreamHandler } from '../lib/stream-parser.js';
import { claudeAuthService } from './claude-auth.service.js';

/** stream-json 이벤트 기본 타입 */
export interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

/** executeChat에 전달할 프로젝트 컨텍스트 */
export interface ChatContext {
  projectName: string;
  branchName?: string | null;
}

class ClaudeService {
  /** 실행 중인 프로세스 관리 (세션ID → 프로세스) */
  private processes = new Map<string, ChildProcess>();

  /**
   * 세션/프로젝트 컨텍스트 기반 시스템 프롬프트 생성
   * Claude CLI에 현재 작업 환경 정보와 merge 명령을 안내한다.
   */
  private buildSystemPrompt(
    sessionId: string,
    worktreePath: string,
    ctx: ChatContext,
  ): string {
    const lines = [
      `[Nexus 플랫폼 컨텍스트]`,
      `- 프로젝트: ${ctx.projectName}`,
      `- 작업 브랜치: ${ctx.branchName ?? 'unknown'}`,
      `- 작업 디렉토리: ${worktreePath}`,
      `- 세션 ID: ${sessionId}`,
      ``,
      `[사용 가능한 명령]`,
      `사용자가 "merge해줘", "main에 반영해줘" 등 merge를 요청하면, 아래 명령을 Bash로 실행하세요:`,
      `curl -s -X POST http://localhost:8080/api/internal/sessions/${sessionId}/merge`,
      `이 명령은 현재 브랜치의 변경사항을 main 브랜치에 merge합니다. 세션과 워크트리는 유지되므로 merge 후에도 계속 작업할 수 있습니다.`,
      `merge 전에 반드시 모든 변경사항을 git commit 하세요.`,
    ];
    return lines.join('\n');
  }

  /**
   * CLI 실행 + stdout stream-json 파싱.
   * userId를 받아 CLAUDE_CONFIG_DIR 환경변수를 주입하고,
   * 실행 전 토큰 만료 여부를 확인하여 자동 갱신한다.
   *
   * @param userId 요청 사용자 ID — 사용자별 claude-configs 디렉토리 결정
   * @param context 프로젝트 컨텍스트 — 시스템 프롬프트에 포함
   */
  async executeChat(
    sessionId: string,
    message: string,
    worktreePath: string,
    claudeSessionId?: string | null,
    userId?: string | null,
    context?: ChatContext,
  ): Promise<EventEmitter> {
    const emitter = new EventEmitter();

    // claudeSessionId에서 -- 시작 문자열 제거 (인자 인젝션 방지)
    const safeClaudeSessionId = claudeSessionId?.replace(/^--/, '') ?? null;

    const args = ['--dangerously-skip-permissions', '--output-format', 'stream-json', '--verbose', '-p'];

    // 프로젝트 컨텍스트가 있으면 시스템 프롬프트 주입
    if (context) {
      const prompt = this.buildSystemPrompt(sessionId, worktreePath, context);
      args.unshift('--append-system-prompt', prompt);
    }

    if (safeClaudeSessionId) {
      // --resume은 다른 플래그 앞에 위치
      args.unshift('--resume', safeClaudeSessionId);
    }

    // userId가 있으면 CLAUDE_CONFIG_DIR을 사용자별 디렉토리로 주입
    // 토큰 만료 시 자동 갱신 (ensureValidToken 내부에서 처리)
    const env: Record<string, string | undefined> = { ...process.env };

    if (userId) {
      // 만료 토큰 자동 갱신 — 실패 시 null (이미 갱신 시도 완료)
      await claudeAuthService.ensureValidToken(userId);
      // CLAUDE_CONFIG_DIR 환경변수로 사용자별 인증 분리
      env.CLAUDE_CONFIG_DIR = claudeAuthService.getConfigDir(userId);
    }

    const proc = spawn('claude', args, {
      cwd: worktreePath,
      env,
      // stdin을 pipe로 열어 message를 안전하게 전달
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // message를 stdin으로 쓰고 닫아 EOF 신호 전송 — stdin이 null이면 스킵
    if (proc.stdin) {
      proc.stdin.write(message, 'utf8');
      proc.stdin.end();
    } else {
      console.warn('[ClaudeService] proc.stdin이 null — 메시지 전달 불가');
    }

    this.processes.set(sessionId, proc);

    // 공통 stream-json 파서 사용
    const { onData, flush } = createStreamHandler(emitter);

    proc.stdout.on('data', onData);

    proc.stderr.on('data', (chunk: Buffer) => {
      emitter.emit('error', chunk.toString());
    });

    proc.on('close', (code) => {
      this.processes.delete(sessionId);
      // 버퍼에 남은 데이터 처리
      flush();
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
