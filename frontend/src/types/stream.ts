// SSE 스트리밍 이벤트 타입 정의

export interface AssistantTextEvent {
  content: string;
}

export interface ToolUseBeginEvent {
  toolId: string;
  tool: string;
}

export interface ToolUseInputEvent {
  toolId: string;
  input: Record<string, unknown>;
}

export interface ToolUseEndEvent {
  toolId: string;
}

export interface ToolResultEvent {
  toolId: string;
  output: string;
  isError: boolean;
}

export interface SystemEvent {
  subtype: 'init' | 'compaction' | 'error';
  message?: string;
}

export interface DoneEvent {
  messageId: string;
  sessionId: string;
  totalTokens: number;
}

export type StreamEventType =
  | 'assistant_text'
  | 'tool_use_begin'
  | 'tool_use_input'
  | 'tool_use_end'
  | 'tool_result'
  | 'system'
  | 'done';
