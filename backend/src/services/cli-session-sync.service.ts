// CLI 세션 동기화 서비스 — Claude Code CLI JSONL 파일 탐색 및 메타데이터 추출

import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const CLAUDE_CONFIGS_DIR =
  process.env.CLAUDE_CONFIGS_DIR || '/home/ubuntu/claude-configs';

/** CLI 세션 정보 */
export interface CliSession {
  claudeSessionId: string;
  filePath: string;
  title: string;
  lastModified: Date;
  fileSize: number;
}

/**
 * repoPath를 Claude CLI의 디렉토리 인코딩 형식으로 변환
 * 예: /home/ubuntu/Nexus → -home-ubuntu-Nexus
 */
function encodeRepoPath(repoPath: string): string {
  return repoPath.replace(/\//g, '-');
}

/**
 * JSONL 파일에서 첫 번째 사용자 메시지를 추출하여 제목으로 사용
 * 처음 50줄만 읽어 성능 보장
 */
async function extractTitle(filePath: string): Promise<string | null> {
  try {
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
      if (lineCount > 50) break;

      try {
        const entry = JSON.parse(line);
        // 사용자 메시지 중 실제 텍스트 내용이 있는 것만 대상
        if (entry.type !== 'user') continue;

        const content = entry.message?.content;
        if (!content) continue;

        // content가 문자열인 경우 (커맨드 메시지 제외)
        if (typeof content === 'string') {
          if (content.includes('<command-message>')) continue;
          return content.slice(0, 50);
        }

        // content가 배열인 경우 — 첫 번째 텍스트 항목 사용
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              // /init 명령어 등 메타 메시지는 건너뜀
              if (entry.isMeta) continue;
              return (item.text as string).slice(0, 50);
            }
          }
        }
      } catch {
        // JSON 파싱 실패 시 다음 줄로
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 특정 디렉토리에서 프로젝트에 해당하는 JSONL 세션 파일 탐색
 */
async function scanDirectory(
  dirPath: string,
): Promise<CliSession[]> {
  const sessions: CliSession[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // JSONL 파일만 대상 (하위 디렉토리 제외)
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;

      const filePath = path.join(dirPath, entry.name);
      const sessionId = entry.name.replace('.jsonl', '');

      try {
        const stat = await fs.stat(filePath);
        const title = await extractTitle(filePath);

        sessions.push({
          claudeSessionId: sessionId,
          filePath,
          title: title || sessionId,
          lastModified: stat.mtime,
          fileSize: stat.size,
        });
      } catch {
        // 개별 파일 읽기 실패 시 건너뜀
      }
    }
  } catch {
    // 디렉토리가 없거나 접근 불가 시 빈 배열 반환
  }

  return sessions;
}

/**
 * 주어진 repoPath에 해당하는 모든 CLI 세션 파일 탐색
 * - ~/.claude/projects/{encoded-path}/ 디렉토리
 * - {CLAUDE_CONFIGS_DIR}/{userId}/projects/{encoded-path}/ 디렉토리 (사용자별)
 */
export async function discoverCliSessions(
  repoPath: string,
): Promise<CliSession[]> {
  const encoded = encodeRepoPath(repoPath);
  const allSessions: CliSession[] = [];

  // 1) 시스템 전역 세션 디렉토리 (~/.claude/projects/)
  const homeDir = process.env.HOME || '/home/ubuntu';
  const globalDir = path.join(homeDir, '.claude', 'projects', encoded);
  const globalSessions = await scanDirectory(globalDir);
  allSessions.push(...globalSessions);

  // 2) 사용자별 세션 디렉토리 ({CLAUDE_CONFIGS_DIR}/*/projects/)
  try {
    const userDirs = await fs.readdir(CLAUDE_CONFIGS_DIR, {
      withFileTypes: true,
    });

    for (const userDir of userDirs) {
      if (!userDir.isDirectory()) continue;
      const userProjectDir = path.join(
        CLAUDE_CONFIGS_DIR,
        userDir.name,
        'projects',
        encoded,
      );
      const userSessions = await scanDirectory(userProjectDir);
      allSessions.push(...userSessions);
    }
  } catch {
    // claude-configs 디렉토리 없으면 무시
  }

  // 최신 수정일 기준 정렬
  allSessions.sort(
    (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
  );

  return allSessions;
}
