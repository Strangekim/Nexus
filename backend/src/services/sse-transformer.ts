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
      events.push({
        event: 'tool_use_begin',
        data: { toolId: block.id, tool: block.name ?? '' },
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
