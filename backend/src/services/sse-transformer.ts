// Claude Code stream-json → SSE 이벤트 변환기

/** SSE 이벤트 인터페이스 */
export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

/** content 블록 내 텍스트/도구 아이템 타입 */
interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
}

/** stream-json 이벤트를 SSE 이벤트 배열로 변환 */
export function transformStreamEvent(raw: Record<string, unknown>): SseEvent[] {
  const events: SseEvent[] = [];
  const type = raw.type as string;

  switch (type) {
    case 'system':
      events.push({
        event: 'system',
        data: {
          subtype: raw.subtype as string,
          message: (raw.message as string) ?? '',
        },
      });
      break;

    case 'assistant':
      events.push(...parseAssistantEvent(raw));
      break;

    case 'content_block_delta':
      events.push(...parseDeltaEvent(raw));
      break;

    case 'user':
      events.push(...parseUserEvent(raw));
      break;

    case 'content_block_stop':
      if (raw.tool_id || raw.toolId) {
        events.push({
          event: 'tool_use_end',
          data: { toolId: (raw.tool_id ?? raw.toolId) as string },
        });
      }
      break;

    case 'result':
      events.push({
        event: 'done',
        data: {
          messageId: (raw.message_id ?? raw.messageId ?? '') as string,
          sessionId: (raw.session_id ?? raw.sessionId ?? '') as string,
          totalTokens: (raw.total_tokens ?? raw.totalTokens ?? 0) as number,
          durationMs: (raw.duration_ms ?? raw.durationMs ?? null) as number | null,
          numTurns: (raw.num_turns ?? raw.numTurns ?? null) as number | null,
          totalCostUsd: (raw.total_cost_usd ?? raw.totalCostUsd ?? null) as number | null,
        },
      });
      break;

    default:
      // 알 수 없는 이벤트 타입 — 무시
      break;
  }

  return events;
}

/** assistant 타입 이벤트 파싱 — 텍스트와 도구 호출 분리 */
function parseAssistantEvent(raw: Record<string, unknown>): SseEvent[] {
  const events: SseEvent[] = [];
  const message = raw.message as Record<string, unknown> | undefined;
  if (!message) return events;

  const content = message.content as ContentBlock[] | undefined;
  if (!Array.isArray(content)) return events;

  for (const block of content) {
    if (block.type === 'text' && block.text) {
      events.push({
        event: 'assistant_text',
        data: { content: block.text },
      });
    } else if (block.type === 'tool_use' && block.id) {
      const toolName = block.name ?? '';
      const summary = extractToolUseSummary(toolName, block.input);
      events.push({
        event: 'tool_use_begin',
        data: {
          toolId: block.id,
          tool: toolName,
          ...(summary ? { toolUseSummary: summary } : {}),
        },
      });
      // 입력이 이미 포함되어 있으면 input 이벤트도 발행
      if (block.input && Object.keys(block.input).length > 0) {
        events.push({
          event: 'tool_use_input',
          data: { toolId: block.id, input: block.input },
        });
      }
    } else if (block.type === 'tool_result') {
      events.push({
        event: 'tool_result',
        data: {
          toolId: block.tool_use_id ?? '',
          output: block.text ?? '',
          isError: block.is_error ?? false,
        },
      });
    }
  }

  return events;
}

/** user 타입 이벤트 파싱 — tool_use_result 추출 */
function parseUserEvent(raw: Record<string, unknown>): SseEvent[] {
  const events: SseEvent[] = [];
  const toolUseResult = raw.tool_use_result as Record<string, unknown> | undefined;

  // tool_use_id를 message.content에서 추출
  const message = raw.message as Record<string, unknown> | undefined;
  const content = message?.content as ContentBlock[] | undefined;
  const toolId = content?.[0]?.tool_use_id ?? '';

  if (!toolUseResult) return events;

  // 결과 메타 정보 구성
  const resultMeta: Record<string, unknown> = {};
  const resultType = toolUseResult.type as string | undefined;
  if (resultType) resultMeta.type = resultType;

  // 파일 읽기 결과 (file 객체 포함)
  const file = toolUseResult.file as Record<string, unknown> | undefined;
  if (file) {
    resultMeta.filePath = file.filePath ?? '';
    resultMeta.numLines = file.numLines ?? null;
  }

  // 파일 목록 결과 (filenames 배열 포함)
  if (toolUseResult.filenames) {
    resultMeta.filenames = toolUseResult.filenames;
    resultMeta.numFiles = toolUseResult.numFiles ?? null;
  }

  // 실행 시간
  if (toolUseResult.durationMs !== undefined) {
    resultMeta.durationMs = toolUseResult.durationMs;
  }

  // 실제 도구 실행 결과 텍스트 추출 (파일 내용, bash 출력 등)
  const contentText = content?.[0]?.text ?? '';
  // 출력 요약 생성
  const output = contentText || buildResultOutput(resultMeta);

  events.push({
    event: 'tool_result',
    data: {
      toolId,
      output,
      isError: false,
      resultMeta,
    },
  });

  return events;
}

/** tool_use_result 메타 정보로부터 사람이 읽기 쉬운 출력 요약 생성 */
function buildResultOutput(meta: Record<string, unknown>): string {
  if (meta.filePath && meta.numLines) {
    return `${meta.filePath} (${meta.numLines} lines)`;
  }
  if (meta.filePath) {
    return meta.filePath as string;
  }
  const filenames = meta.filenames as string[] | undefined;
  if (filenames && filenames.length > 0) {
    return filenames.length <= 3
      ? filenames.join(', ')
      : `${filenames.slice(0, 3).join(', ')} 외 ${filenames.length - 3}개`;
  }
  return '';
}

/** 도구 호출 시 입력에서 핵심 정보를 추출하여 요약 반환 */
function extractToolUseSummary(
  toolName: string,
  input?: Record<string, unknown>,
): string | null {
  if (!input) return null;

  switch (toolName) {
    case 'Read':
    case 'Edit':
    case 'Write':
      return input.file_path ? String(input.file_path) : null;
    case 'Bash':
      return input.command ? String(input.command) : null;
    case 'Glob':
      return input.pattern ? String(input.pattern) : null;
    case 'Grep':
      return input.pattern ? String(input.pattern) : null;
    default:
      return null;
  }
}

/** content_block_delta 타입 이벤트 파싱 */
function parseDeltaEvent(raw: Record<string, unknown>): SseEvent[] {
  const events: SseEvent[] = [];
  const delta = raw.delta as Record<string, unknown> | undefined;
  if (!delta) return events;

  if (delta.type === 'text_delta' && delta.text) {
    events.push({
      event: 'assistant_text',
      data: { content: delta.text as string },
    });
  } else if (delta.type === 'input_json_delta' && delta.partial_json !== undefined) {
    const toolId = (raw.tool_id ?? raw.toolId ?? '') as string;
    events.push({
      event: 'tool_use_input',
      data: { toolId, input: delta.partial_json },
    });
  }

  return events;
}
