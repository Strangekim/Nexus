// 채팅 UI 확인용 목데이터 메시지

import type { Message } from '@/types/message';

/** 목데이터 세션 ID — 실제 API 결과가 없을 때 폴백으로 사용 */
export const MOCK_SESSION_ID = 'mock-session-preview';

export const MOCK_MESSAGES: Message[] = [
  // 1. 유저 메시지 — 로그인 API 구현 요청
  {
    id: 'mock-msg-1',
    sessionId: MOCK_SESSION_ID,
    role: 'user',
    type: 'text',
    content:
      '로그인 API를 만들어줘. POST /api/auth/login 엔드포인트로, 이메일과 비밀번호를 받아서 세션을 생성하는 방식으로.',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },

  // 2. 어시스턴트 메시지 — 텍스트 + tool_use (Edit)
  {
    id: 'mock-msg-2',
    sessionId: MOCK_SESSION_ID,
    role: 'assistant',
    type: 'text',
    content:
      '로그인 API를 구현하겠습니다. Fastify 라우트로 만들고, bcrypt로 비밀번호를 검증한 뒤 세션을 생성하겠습니다.',
    metadata: {
      toolsUsed: ['Edit'],
      filesChanged: ['backend/src/routes/auth/login.ts'],
    },
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },

  // 3. tool_use 메시지 — Edit 도구 사용 (파일 생성)
  {
    id: 'mock-msg-3',
    sessionId: MOCK_SESSION_ID,
    role: 'assistant',
    type: 'tool_use',
    content: JSON.stringify({
      tool: 'Edit',
      status: 'completed',
      input: {
        file_path: 'backend/src/routes/auth/login.ts',
        old_string: '',
        new_string: `import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';

const loginRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } });
    }
    request.session.userId = user.id;
    return reply.send({ userId: user.id, email: user.email });
  });
};

export default loginRoute;`,
      },
      output: 'File created successfully.',
    }),
    createdAt: new Date(Date.now() - 3 * 60 * 1000 - 30 * 1000).toISOString(),
  },

  // 4. 어시스턴트 메시지 — 코드블록 포함 설명
  {
    id: 'mock-msg-4',
    sessionId: MOCK_SESSION_ID,
    role: 'assistant',
    type: 'text',
    content: `파일을 생성했습니다. 구현 내용은 다음과 같습니다:

\`\`\`typescript
// backend/src/routes/auth/login.ts
import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';

const loginRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    // DB에서 유저 조회
    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
      });
    }

    // 세션에 userId 저장
    request.session.userId = user.id;
    return reply.send({ userId: user.id, email: user.email });
  });
};

export default loginRoute;
\`\`\`

**주요 포인트:**
- \`bcrypt.compare\`로 해시된 비밀번호 검증
- 인증 실패 시 \`401 INVALID_CREDENTIALS\` 반환
- 성공 시 \`@fastify/session\`에 \`userId\` 저장 (httpOnly cookie 방식)`,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },

  // 5. 유저 메시지 — 테스트 요청
  {
    id: 'mock-msg-5',
    sessionId: MOCK_SESSION_ID,
    role: 'user',
    type: 'text',
    content: '테스트해봐',
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },

  // 6. 어시스턴트 메시지 — 텍스트
  {
    id: 'mock-msg-6',
    sessionId: MOCK_SESSION_ID,
    role: 'assistant',
    type: 'text',
    content: '테스트를 실행하겠습니다.',
    createdAt: new Date(Date.now() - 1 * 60 * 1000 - 30 * 1000).toISOString(),
  },

  // 7. tool_use 메시지 — Bash 도구 사용 (테스트 실행)
  {
    id: 'mock-msg-7',
    sessionId: MOCK_SESSION_ID,
    role: 'assistant',
    type: 'tool_use',
    content: JSON.stringify({
      tool: 'Bash',
      status: 'completed',
      input: {
        command: 'cd backend && npm test -- --testPathPattern=auth/login',
        description: '로그인 API 유닛 테스트 실행',
      },
      output: `PASS src/routes/auth/__tests__/login.test.ts
  로그인 API
    ✓ 올바른 이메일/비밀번호로 로그인 성공 (42ms)
    ✓ 잘못된 비밀번호로 401 반환 (18ms)
    ✓ 존재하지 않는 이메일로 401 반환 (12ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        1.234s

✓ 3 tests passed`,
    }),
    createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
];
