// JSONL 세션 파일에서 메시지를 직접 읽는 서비스
// 관리자 전용 프로젝트의 CLI 세션 대화 내용 조회에 사용
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import readline from 'readline';
import path from 'path';

/** JSONL에서 추출한 메시지 */
export interface JsonlMessage {
  id: string;
  role: 'user' | 'assistant';
  type: 'text';
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** claudeSessionId + repoPath로 JSONL 파일 경로 후보 반환 */
export function resolveJsonlPaths(claudeSessionId: string, repoPath: string): string[] {
  const parts = claudeSessionId.split(':');
  const sessionId = parts.length > 1 ? parts[1] : parts[0];
  const userId = parts.length > 1 ? parts[0] : null;
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

/** JSONL 파일에서 메시지 추출 */
export async function readJsonlMessages(
  jsonlPath: string,
  page = 1,
  limit = 50,
): Promise<{ messages: JsonlMessage[]; total: number }> {
  try { await fs.access(jsonlPath); } catch { return { messages: [], total: 0 }; }

  const all: JsonlMessage[] = [];
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

  const total = all.length;
  const start = (page - 1) * limit;
  return { messages: all.slice(start, start + limit), total };
}

/** JSONL 이벤트 → 메시지 변환 */
function parseEvent(evt: Record<string, unknown>, idx: number): JsonlMessage | null {
  const type = evt.type as string;
  const ts = (evt.timestamp as string) || '';
  const id = (evt.uuid as string) || `msg-${idx}`;

  if (type === 'user') {
    const content = (evt.message as Record<string, unknown>)?.content;
    // 문자열 = 직접 유저 입력
    if (typeof content === 'string' && content.trim()) {
      const cleaned = cleanContent(content);
      if (!cleaned) return null;
      return { id, role: 'user', type: 'text', content: cleaned, createdAt: ts };
    }
    // 배열 = tool_result (스킵) 또는 text
    if (Array.isArray(content)) {
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
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, '')
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, '')
    .replace(/<local-command-stderr>[\s\S]*?<\/local-command-stderr>/g, '')
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
