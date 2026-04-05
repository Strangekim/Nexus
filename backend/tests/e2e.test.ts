// E2E 테스트 — 실제 서버에 HTTP 요청을 보내 핵심 기능 검증
// 실행: cd backend && npm test
// 전제조건: 서버가 localhost:8080에서 실행 중이어야 함
import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.TEST_API_URL || 'http://localhost:8080';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@nexus.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

/** 쿠키 저장소 */
let sessionCookie = '';
let currentUserId = '';
let projectId = '';
let testSessionId = '';

/** 인증된 fetch — POST body가 없으면 Content-Type 생략 */
async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { Cookie: sessionCookie };
  // body가 있을 때만 Content-Type 설정 (Fastify가 빈 body + json content-type이면 400 반환)
  if (init?.body) headers['Content-Type'] = 'application/json';
  return fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });
}

// ────────────────────────────────────────────
// 0. 사전 준비 — 로그인 + 기본 데이터 로드
// ────────────────────────────────────────────
beforeAll(async () => {
  // 로그인
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  if (res.status !== 200) {
    throw new Error(`로그인 실패: ${res.status} — ${await res.text()}`);
  }
  const body = await res.json();
  currentUserId = body.user.id;

  const setCookie = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie') ?? ''];
  const cookie = setCookie.find((c: string) => c.includes('connect.sid'));
  if (!cookie) throw new Error('세션 쿠키 없음');
  sessionCookie = cookie.split(';')[0];

  // 프로젝트 목록 로드
  const projRes = await authFetch('/api/projects');
  const projBody = await projRes.json();
  const projects = projBody.data ?? projBody;
  if (projects.length > 0) {
    projectId = projects[0].id;
  }

  // 세션 목록 로드
  if (projectId) {
    const sessRes = await authFetch(`/api/sessions?projectId=${projectId}`);
    const sessBody = await sessRes.json();
    const sessions = Array.isArray(sessBody) ? sessBody : (sessBody.data ?? []);
    if (sessions.length > 0) {
      testSessionId = sessions[0].id;
    }
  }
});

// ────────────────────────────────────────────
// 1. 헬스 체크
// ────────────────────────────────────────────
describe('헬스 체크', () => {
  it('GET /api/health → 200', async () => {
    const res = await fetch(`${API}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

// ────────────────────────────────────────────
// 2. 인증
// ────────────────────────────────────────────
describe('인증', () => {
  it('인증 없이 보호된 API → 401', async () => {
    const res = await fetch(`${API}/api/projects`);
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me → 현재 사용자', async () => {
    const res = await authFetch('/api/auth/me');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(TEST_EMAIL);
    expect(body.id).toBeDefined();
  });
});

// ────────────────────────────────────────────
// 3. 프로젝트
// ────────────────────────────────────────────
describe('프로젝트', () => {
  it('GET /api/projects → 프로젝트 목록', async () => {
    const res = await authFetch('/api/projects');
    expect(res.status).toBe(200);
    const body = await res.json();
    const projects = body.data ?? body;
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });

  it('GET /api/projects/:id → 단일 프로젝트', async () => {
    if (!projectId) return;
    const res = await authFetch(`/api/projects/${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(projectId);
    expect(body.name).toBeDefined();
  });
});

// ────────────────────────────────────────────
// 4. 세션
// ────────────────────────────────────────────
describe('세션', () => {
  it('GET /api/sessions?projectId → 세션 목록', async () => {
    if (!projectId) return;
    const res = await authFetch(`/api/sessions?projectId=${projectId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const sessions = Array.isArray(body) ? body : (body.data ?? []);
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('GET /api/sessions/:id → 세션 상세', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(testSessionId);
    expect(body.title).toBeDefined();
    expect(body.projectId).toBe(projectId);
  });

  it('존재하지 않는 세션 → 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await authFetch(`/api/sessions/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────
// 5. 메시지 조회 (하이브리드 JSONL/DB)
// ────────────────────────────────────────────
describe('메시지 조회', () => {
  it('GET messages → 기본 페이지네이션', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}/messages`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBeGreaterThanOrEqual(1);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('page=-1 → 마지막 페이지', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}/messages?page=-1&limit=10`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(body.pagination.totalPages);
  });

  it('메시지 role은 user 또는 assistant만', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}/messages?limit=200`);
    const body = await res.json();
    for (const msg of body.messages) {
      expect(['user', 'assistant']).toContain(msg.role);
      expect(msg.content).toBeDefined();
      expect(typeof msg.content).toBe('string');
    }
  });

  it('메시지에 시스템 태그 미포함', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}/messages?limit=200`);
    const body = await res.json();
    const systemTags = [
      '<system-reminder>', '<task-notification>',
      '<local-command-caveat>', '<user-prompt-submit-hook>',
    ];
    for (const msg of body.messages) {
      if (msg.role === 'user') {
        for (const tag of systemTags) {
          expect(msg.content).not.toContain(tag);
        }
      }
    }
  });

  it('세션 간 메시지 ID 겹침 없음', async () => {
    if (!projectId) return;
    const sessRes = await authFetch(`/api/sessions?projectId=${projectId}`);
    const sessBody = await sessRes.json();
    const sessions = (Array.isArray(sessBody) ? sessBody : (sessBody.data ?? [])).slice(0, 3);
    if (sessions.length < 2) return;

    const allIds: Map<string, string> = new Map(); // msgId → sessionId
    for (const s of sessions) {
      const res = await authFetch(`/api/sessions/${s.id}/messages?limit=200`);
      const body = await res.json();
      for (const msg of body.messages) {
        if (allIds.has(msg.id)) {
          // 같은 ID가 다른 세션에서 나오면 실패
          expect(allIds.get(msg.id)).toBe(s.id);
        }
        allIds.set(msg.id, s.id);
      }
    }
  });
});

// ────────────────────────────────────────────
// 6. 세션 락
// ────────────────────────────────────────────
describe('세션 락', () => {
  it('락 획득 → 해제 사이클', async () => {
    if (!testSessionId) return;
    // 획득
    const lockRes = await authFetch(`/api/sessions/${testSessionId}/lock`, { method: 'POST' });
    expect(lockRes.status).toBe(200);
    const lockBody = await lockRes.json();
    expect(lockBody.lockedBy).toBeDefined();

    // 해제
    const unlockRes = await authFetch(`/api/sessions/${testSessionId}/unlock`, { method: 'POST' });
    expect(unlockRes.status).toBe(200);
    const unlockBody = await unlockRes.json();
    expect(unlockBody.lockedBy).toBeNull();
  });
});

// ────────────────────────────────────────────
// 7. 채팅 중단
// ────────────────────────────────────────────
describe('채팅 중단', () => {
  it('실행 중인 작업 없을 때 abort → 404', async () => {
    if (!testSessionId) return;
    const res = await authFetch(`/api/sessions/${testSessionId}/abort`, { method: 'POST' });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ────────────────────────────────────────────
// 8. 알림
// ────────────────────────────────────────────
describe('알림', () => {
  it('GET /api/notifications → 알림 목록', async () => {
    const res = await authFetch('/api/notifications');
    expect(res.status).toBe(200);
  });
});

// ────────────────────────────────────────────
// 9. 사용자 관리
// ────────────────────────────────────────────
describe('사용자 관리', () => {
  it('사용자 목록 — 비밀번호 미노출', async () => {
    const res = await authFetch('/api/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    const users = body.users ?? body.data ?? body;
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
    for (const user of users) {
      expect(user.passwordHash).toBeUndefined();
      expect(user.password_hash).toBeUndefined();
    }
  });
});

// ────────────────────────────────────────────
// 10. 에러 형식 일관성
// ────────────────────────────────────────────
describe('에러 응답 형식', () => {
  it('404 → { error: { code, message } }', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await authFetch(`/api/sessions/${fakeId}`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error.code).toBe('string');
    expect(typeof body.error.message).toBe('string');
  });
});
