// JSONL 세션 파일 경로 해석 서비스
// claudeSessionId → 파일 경로 변환, 최신 파일 탐색, 컨텍스트 압축 체인 추적
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import path from 'path';

/** 경로 구성 요소에 위험 문자가 포함되어 있는지 검사 */
function isSafePathSegment(segment: string): boolean {
  return !!segment && !segment.includes('..') && !segment.includes('/') && !segment.includes('\\');
}

/** repoPath에 위험 문자가 포함되어 있지 않은지 검사 — .. 시퀀스 차단 */
function isSafeRepoPath(repoPath: string): boolean {
  return !!repoPath && !repoPath.includes('..');
}

/** claudeSessionId + repoPath로 JSONL 파일 경로 후보 반환 */
export function resolveJsonlPaths(claudeSessionId: string, repoPath: string): string[] {
  const parts = claudeSessionId.split(':');
  const sessionId = parts.length > 1 ? parts[1] : parts[0];
  const userId = parts.length > 1 ? parts[0] : null;

  // Path traversal 방지
  if (!isSafePathSegment(sessionId)) return [];
  if (userId && !isSafePathSegment(userId)) return [];
  if (!isSafeRepoPath(repoPath)) return [];

  const cwdEncoded = repoPath.replace(/\//g, '-');
  const homeDir = process.env.HOME || '/home/ubuntu';
  const configBase = process.env.CLAUDE_CONFIGS_DIR || '/home/ubuntu/claude-configs';

  const paths = [
    path.join(homeDir, '.claude', 'projects', cwdEncoded, `${sessionId}.jsonl`),
  ];
  if (userId) {
    paths.push(path.join(configBase, userId, 'projects', cwdEncoded, `${sessionId}.jsonl`));
  }
  return paths;
}

/**
 * admin-only 프로젝트용: 가장 최근 수정된 JSONL 파일 경로 반환
 * CLI가 컨텍스트 압축 등으로 새 세션 파일을 생성하면 DB의 claudeSessionId와 달라지는데,
 * 이 함수로 항상 최신 대화를 찾는다.
 */
export async function findLatestJsonlPath(repoPath: string): Promise<string | null> {
  if (!isSafeRepoPath(repoPath)) return null;

  const cwdEncoded = repoPath.replace(/\//g, '-');
  const homeDir = process.env.HOME || '/home/ubuntu';
  const projectDir = path.join(homeDir, '.claude', 'projects', cwdEncoded);

  try {
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));
    if (jsonlFiles.length === 0) return null;

    // 수정 시간 기준으로 가장 최근 파일 선택
    let latest = { path: '', mtime: 0 };
    for (const f of jsonlFiles) {
      const fullPath = path.join(projectDir, f);
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs > latest.mtime) {
        latest = { path: fullPath, mtime: stat.mtimeMs };
      }
    }
    return latest.path || null;
  } catch {
    return null;
  }
}

/** 첫 이벤트 타임스탬프 캐시 — 사이즈 제한 적용 */
const MAX_TS_CACHE_SIZE = 500;
const firstTsCache = new Map<string, number>();

/** JSONL 파일의 첫 이벤트 타임스탬프 반환 (캐시 지원) */
export async function getFirstTimestamp(jsonlPath: string): Promise<number | null> {
  const cached = firstTsCache.get(jsonlPath);
  if (cached !== undefined) return cached;

  try {
    const rl = readline.createInterface({
      input: createReadStream(jsonlPath, 'utf8'),
      crlfDelay: Infinity,
    });

    let result: number | null = null;
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        if (evt.timestamp) {
          result = new Date(evt.timestamp).getTime();
          break;
        }
      } catch { /* 무시 */ }
    }

    if (result) {
      firstTsCache.set(jsonlPath, result);
      // 사이즈 초과 시 오래된 항목 제거
      if (firstTsCache.size > MAX_TS_CACHE_SIZE) {
        const oldest = firstTsCache.keys().next().value;
        if (oldest) firstTsCache.delete(oldest);
      }
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * 컨텍스트 압축 체인 추적 — 저장된 세션에서 시작하여 가장 최신 연속 파일 탐색
 * 압축 시 새 JSONL의 첫 타임스탬프 ≈ 이전 JSONL의 마지막 수정 시각 (수 초 이내)
 * 체인을 끝까지 따라가 최신 파일 경로를 반환. 연속 없으면 null.
 */
export async function findLatestContinuation(
  startSessionId: string,
  repoPath: string,
): Promise<string | null> {
  if (!isSafeRepoPath(repoPath)) return null;

  const cwdEncoded = repoPath.replace(/\//g, '-');
  const homeDir = process.env.HOME || '/home/ubuntu';
  const projectDir = path.join(homeDir, '.claude', 'projects', cwdEncoded);

  let dirFiles: string[];
  try { dirFiles = await fs.readdir(projectDir); } catch { return null; }

  // 모든 JSONL 파일 정보 수집
  interface FileInfo { path: string; sessionId: string; mtime: number; firstTs: number }
  const fileInfos: FileInfo[] = [];
  for (const f of dirFiles.filter((f) => f.endsWith('.jsonl'))) {
    const fullPath = path.join(projectDir, f);
    try {
      const stat = await fs.stat(fullPath);
      const firstTs = await getFirstTimestamp(fullPath);
      if (firstTs) {
        fileInfos.push({ path: fullPath, sessionId: f.replace('.jsonl', ''), mtime: stat.mtimeMs, firstTs });
      }
    } catch { /* 무시 */ }
  }

  // 시작 파일 찾기
  const start = fileInfos.find((f) => f.sessionId === startSessionId);
  if (!start) return null;

  // 체인 따라가기 — 현재 파일 mtime 이후에 시작된 파일 중 가장 가까운 것 선택
  const GAP_MS = 30 * 60 * 1000; // 30분 — 컨텍스트 압축이 오래 걸릴 수 있음
  const visited = new Set<string>();
  let current = start;

  while (true) {
    visited.add(current.sessionId);
    // 현재 파일의 mtime 이후(또는 직전)에 시작된 파일만 후보로 선택
    let bestNext: FileInfo | null = null;
    let bestGap = GAP_MS;
    for (const f of fileInfos) {
      if (visited.has(f.sessionId)) continue;
      const gap = f.firstTs - current.mtime;
      // 양방향 허용하되 절대값으로 가장 가까운 것 선택
      if (gap > -GAP_MS && gap < GAP_MS && Math.abs(gap) < bestGap) {
        bestGap = Math.abs(gap);
        bestNext = f;
      }
    }
    if (!bestNext) break;
    current = bestNext;
  }

  return current.sessionId !== startSessionId ? current.path : null;
}

/**
 * 전체 JSONL 체인 반환 — 시작 파일 + 모든 continuation 파일 (시간순 정렬)
 * 컨텍스트 압축으로 생성된 모든 파일을 포함하여 대화 유실 방지
 */
export async function resolveJsonlChain(
  startSessionId: string,
  repoPath: string,
): Promise<string[]> {
  if (!isSafeRepoPath(repoPath)) return [];

  const cwdEncoded = repoPath.replace(/\//g, '-');
  const homeDir = process.env.HOME || '/home/ubuntu';
  const projectDir = path.join(homeDir, '.claude', 'projects', cwdEncoded);

  let dirFiles: string[];
  try { dirFiles = await fs.readdir(projectDir); } catch { return []; }

  // 모든 JSONL 파일 정보 수집
  interface FileInfo { path: string; sessionId: string; mtime: number; firstTs: number }
  const fileInfos: FileInfo[] = [];
  for (const f of dirFiles.filter((f) => f.endsWith('.jsonl'))) {
    const fullPath = path.join(projectDir, f);
    try {
      const stat = await fs.stat(fullPath);
      const firstTs = await getFirstTimestamp(fullPath);
      if (firstTs) {
        fileInfos.push({ path: fullPath, sessionId: f.replace('.jsonl', ''), mtime: stat.mtimeMs, firstTs });
      }
    } catch { /* 무시 */ }
  }

  // 시작 파일 찾기
  const start = fileInfos.find((f) => f.sessionId === startSessionId);
  if (!start) return [];

  // 체인 따라가기 — 시작 파일 포함하여 모든 연속 파일 수집
  const GAP_MS = 30 * 60 * 1000;
  const chain: FileInfo[] = [start];
  const visited = new Set<string>([start.sessionId]);

  let current = start;
  while (true) {
    let bestNext: FileInfo | null = null;
    let bestGap = GAP_MS;
    for (const f of fileInfos) {
      if (visited.has(f.sessionId)) continue;
      const gap = f.firstTs - current.mtime;
      if (gap > -GAP_MS && gap < GAP_MS && Math.abs(gap) < bestGap) {
        bestGap = Math.abs(gap);
        bestNext = f;
      }
    }
    if (!bestNext) break;
    visited.add(bestNext.sessionId);
    chain.push(bestNext);
    current = bestNext;
  }

  // 시간순 정렬
  chain.sort((a, b) => a.firstTs - b.firstTs);
  return chain.map((f) => f.path);
}
