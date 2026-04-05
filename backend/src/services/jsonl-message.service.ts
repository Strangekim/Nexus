// JSONL 세션 파일에서 메시지를 직접 읽는 서비스
// 관리자 전용 프로젝트의 CLI 세션 대화 내용 조회에 사용
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';

// 경로 해석 함수 re-export — 기존 import 경로 호환
export { resolveJsonlPaths, findLatestJsonlPath, findLatestContinuation, resolveJsonlChain, getFirstTimestamp } from './jsonl-resolver.service.js';

/** JSONL에서 추출한 메시지 */
export interface JsonlMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** 파싱 결과 캐시 — 파일경로 → { messages, mtime, byteSize } */
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB
let totalCacheBytes = 0;
const parseCache = new Map<string, { messages: JsonlMessage[]; mtime: number; byteSize: number }>();

/** 메시지 배열의 대략적 바이트 크기 추정 */
function estimateBytes(messages: JsonlMessage[]): number {
  let size = 0;
  for (const m of messages) {
    size += m.content.length * 2 + 200; // content(UTF-16) + 메타데이터 오버헤드
  }
  return size;
}

/** 캐시 용량 초과 시 오래된 항목부터 제거 */
function evictCache(): void {
  while (totalCacheBytes > MAX_CACHE_BYTES && parseCache.size > 0) {
    const oldest = parseCache.keys().next().value;
    if (!oldest) break;
    const entry = parseCache.get(oldest);
    if (entry) totalCacheBytes -= entry.byteSize;
    parseCache.delete(oldest);
  }
}

/** JSONL 파일에서 메시지 추출 (캐시 지원, page=-1이면 마지막 페이지) */
export async function readJsonlMessages(
  jsonlPath: string,
  page = 1,
  limit = 50,
): Promise<{ messages: JsonlMessage[]; total: number; effectivePage: number }> {
  // 파일 존재 + 수정 시간 확인 (fs.stat 하나로 통합)
  let stat;
  try { stat = await fs.stat(jsonlPath); } catch { return { messages: [], total: 0, effectivePage: 1 }; }

  const mtime = stat.mtimeMs;
  const cached = parseCache.get(jsonlPath);

  let all: JsonlMessage[];
  if (cached && cached.mtime === mtime) {
    all = cached.messages;
  } else {
    // 이전 캐시가 있으면 바이트 카운터에서 제거
    if (cached) {
      totalCacheBytes -= cached.byteSize;
      parseCache.delete(jsonlPath);
    }
    // 파일 전체 파싱
    all = [];
    let idx = 0;
    const rl = readline.createInterface({
      input: createReadStream(jsonlPath, 'utf8'),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        const msg = parseEvent(evt, idx);
        if (msg) { all.push(msg); idx++; }
      } catch { /* 무시 */ }
    }
    // 캐시 저장 (바이트 기반 LRU)
    const byteSize = estimateBytes(all);
    parseCache.set(jsonlPath, { messages: all, mtime, byteSize });
    totalCacheBytes += byteSize;
    evictCache();
  }

  const total = all.length;

  // page=-1이면 마지막 페이지
  const effectivePage = page === -1 ? Math.max(1, Math.ceil(total / limit)) : page;
  const start = (effectivePage - 1) * limit;
  return { messages: all.slice(start, start + limit), total, effectivePage };
}

/**
 * 여러 JSONL 파일(체인)에서 메시지를 모아 시간순 병합 + 페이지네이션
 * 컨텍스트 압축으로 생성된 연속 파일들을 하나의 대화로 통합
 */
export async function readJsonlChainMessages(
  jsonlPaths: string[],
  page = 1,
  limit = 50,
): Promise<{ messages: JsonlMessage[]; total: number; effectivePage: number }> {
  if (jsonlPaths.length === 0) return { messages: [], total: 0, effectivePage: 1 };

  // 단일 파일이면 기존 함수 사용
  if (jsonlPaths.length === 1) return readJsonlMessages(jsonlPaths[0], page, limit);

  // 모든 파일에서 메시지 수집
  const allMessages: JsonlMessage[] = [];
  for (const p of jsonlPaths) {
    const result = await readJsonlMessages(p, 1, Number.MAX_SAFE_INTEGER);
    allMessages.push(...result.messages);
  }

  // 타임스탬프 기준 정렬
  allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // 중복 제거 — 같은 타임스탬프 + 같은 role + 같은 content의 첫 등장만 유지
  const seen = new Set<string>();
  const unique = allMessages.filter((m) => {
    const key = `${m.createdAt}:${m.role}:${m.content.slice(0, 100)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const total = unique.length;
  const effectivePage = page === -1 ? Math.max(1, Math.ceil(total / limit)) : page;
  const start = (effectivePage - 1) * limit;
  return { messages: unique.slice(start, start + limit), total, effectivePage };
}

/** JSONL 이벤트 → 메시지 변환 */
function parseEvent(evt: Record<string, unknown>, idx: number): JsonlMessage | null {
  const type = evt.type as string;
  const ts = (evt.timestamp as string) || '';
  const id = (evt.uuid as string) || `msg-${idx}`;

  if (type === 'user') {
    // tool_use_result 프로퍼티가 있으면 도구 결과 이벤트 — 유저 메시지가 아니므로 스킵
    if (evt.tool_use_result) return null;

    const content = (evt.message as Record<string, unknown>)?.content;
    // 문자열 = 직접 유저 입력
    if (typeof content === 'string' && content.trim()) {
      const cleaned = cleanContent(content);
      if (!cleaned) return null;
      return { id, role: 'user', type: 'text', content: cleaned, createdAt: ts };
    }
    // 배열 = tool_result 블록이 포함되어 있으면 스킵
    if (Array.isArray(content)) {
      const hasToolResult = content.some((c: { type?: string }) => c.type === 'tool_result');
      if (hasToolResult) return null;
      const textBlock = content.find((c: { type?: string }) => c.type === 'text');
      if (textBlock?.text && typeof textBlock.text === 'string') {
        const cleaned = cleanContent(textBlock.text);
        if (!cleaned) return null;
        return { id, role: 'user', type: 'text', content: cleaned, createdAt: ts };
      }
    }
    return null;
  }

  if (type === 'assistant') {
    const blocks = (evt.message as Record<string, unknown>)?.content;
    if (!Array.isArray(blocks)) return null;

    let text = '';
    const tools: { toolId: string; tool: string; summary?: string }[] = [];

    for (const b of blocks) {
      if (b.type === 'text' && typeof b.text === 'string') text += b.text;
      if (b.type === 'tool_use') {
        const input = b.input as Record<string, unknown> | undefined;
        tools.push({
          toolId: (b.id as string) || '',
          tool: (b.name as string) || '',
          summary: toolSummary(b.name as string, input),
        });
      }
    }

    if (!text && tools.length === 0) return null;

    // 텍스트가 있는 메시지만 반환 — 도구만 사용한 턴은 스킵 (노이즈 감소)
    if (!text.trim()) return null;

    return {
      id, role: 'assistant', type: 'text', content: text,
      metadata: tools.length > 0 ? { toolsUsed: tools.map((t) => t.tool), toolDetails: tools } : null,
      createdAt: ts,
    };
  }

  return null;
}

/** 시스템 태그 제거 */
function cleanContent(s: string): string {
  return s
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<task-notification>[\s\S]*?<\/task-notification>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/<local-command-stderr>[\s\S]*?<\/local-command-stderr>/g, '')
    .replace(/<user-prompt-submit-hook>[\s\S]*?<\/user-prompt-submit-hook>/g, '')
    .trim();
}

/** 도구 요약 */
function toolSummary(tool: string, input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;
  switch (tool) {
    case 'Read': case 'Edit': case 'Write': return input.file_path as string | undefined;
    case 'Bash': return input.command as string | undefined;
    case 'Glob': case 'Grep': return input.pattern as string | undefined;
    default: return undefined;
  }
}
