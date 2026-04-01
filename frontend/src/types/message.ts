// 메시지 타입 정의

export interface Message {
  id: string;
  sessionId: string;
  userId?: string | null;
  role: 'user' | 'assistant';
  type: 'text' | 'tool_use' | 'tool_result' | 'error';
  content: string;
  metadata?: {
    toolsUsed?: string[];
    filesChanged?: string[];
  } | null;
  tokenCount?: number | null;
  createdAt: string;
}

// 스트리밍 중인 도구 사용 정보
export interface ActiveToolUse {
  toolId: string;
  tool: string;
  input?: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  status: 'running' | 'completed';
}
