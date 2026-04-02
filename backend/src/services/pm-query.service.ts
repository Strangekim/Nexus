// PM 자연어 질의 서비스 — 컨텍스트 수집 + Claude Code 읽기 전용 실행
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import prisma from '../lib/prisma.js';
import { StreamEvent } from './claude.service.js';

/** 프로젝트당 동시 질의 카운터 */
const activeQueries = new Map<string, number>();

/** 동시 질의 최대 허용 수 */
const MAX_CONCURRENT = 2;

class PMQueryService {
  /** 컨텍스트 프롬프트 구성 */
  private buildPrompt(
    sessions: Array<{ title: string; status: string; createdAt: Date; messages: Array<{ role: string; content: string }> }>,
    commits: Array<{ hash: string; message: string | null; author: string | null; createdAt: Date }>,
    userMessage: string,
  ): string {
    const sessionSummary = sessions
      .map((s) => {
        const lastMsg = s.messages[0]?.content?.slice(0, 100) ?? '(없음)';
        return `- [${s.status}] ${s.title} (${s.createdAt.toISOString().slice(0, 10)}): ${lastMsg}`;
      })
      .join('\n');

    const commitSummary = commits
      .map((c) => `- ${c.hash.slice(0, 7)} ${c.author ?? '?'}: ${c.message ?? '(메시지 없음)'} (${c.createdAt.toISOString().slice(0, 10)})`)
      .join('\n');

    return [
      '# 프로젝트 현황 컨텍스트',
      '',
      '## 최근 세션 (최대 10개)',
      sessionSummary || '(세션 없음)',
      '',
      '## 최근 커밋 (최대 50개)',
      commitSummary || '(커밋 없음)',
      '',
      '---',
      '',
      '위 컨텍스트를 바탕으로 다음 질문에 답변해줘. 파일 읽기가 필요하면 Read/Glob/Grep 도구를 사용해도 돼.',
      '',
      `## 질문: ${userMessage}`,
    ].join('\n');
  }

  /** PM 질의 실행 — EventEmitter 반환 (채팅과 동일 패턴) */
  async query(projectId: string, message: string, folderId?: string): Promise<EventEmitter> {
    const emitter = new EventEmitter();

    // 동시 질의 수 확인
    const current = activeQueries.get(projectId) ?? 0;
    if (current >= MAX_CONCURRENT) {
      // 비동기로 에러 emit (이벤트 루프 다음 틱)
      setTimeout(() => emitter.emit('error', '이 프로젝트에서 이미 최대 동시 질의 수에 도달했습니다'), 0);
      return emitter;
    }

    // 프로젝트 + 컨텍스트 조회
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      setTimeout(() => emitter.emit('error', '프로젝트를 찾을 수 없습니다'), 0);
      return emitter;
    }

    // 세션 컨텍스트 수집
    const sessions = await prisma.session.findMany({
      where: { projectId, ...(folderId ? { folderId } : {}) },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: { messages: { take: 3, orderBy: { createdAt: 'desc' }, select: { role: true, content: true } } },
    });

    // 커밋 컨텍스트 수집
    const commits = await prisma.commit.findMany({
      where: { projectId },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { hash: true, message: true, author: true, createdAt: true },
    });

    const prompt = this.buildPrompt(sessions, commits, message);

    // 카운터 증가
    activeQueries.set(projectId, current + 1);

    // Claude Code 읽기 전용 실행 — stdin으로 프롬프트 전달
    const proc = spawn('claude', [
      '--output-format', 'stream-json',
      '--allowedTools', 'Read,Glob,Grep',
      '-p',
    ], {
      cwd: project.repoPath,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // stdin으로 프롬프트 전달 후 닫기
    proc.stdin.write(prompt, 'utf8');
    proc.stdin.end();

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
          // JSON 파싱 실패 무시
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      emitter.emit('error', chunk.toString());
    });

    proc.on('close', (code) => {
      // 카운터 감소
      const cnt = activeQueries.get(projectId) ?? 1;
      if (cnt <= 1) activeQueries.delete(projectId);
      else activeQueries.set(projectId, cnt - 1);

      // 남은 버퍼 처리
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as StreamEvent;
          emitter.emit('event', event);
        } catch { /* 무시 */ }
      }
      emitter.emit('close', code);
    });

    return emitter;
  }
}

export const pmQueryService = new PMQueryService();
