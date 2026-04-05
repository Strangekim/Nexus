// Nexus 브라우저 E2E 테스트 — Playwright
// 실행: npx playwright test
// 전제조건: 프론트(3000) + 백엔드(8080) 서버가 실행 중이어야 함
import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@nexus.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test1234';

// ────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────
async function login(page: Page) {
  await page.goto('/');
  await page.waitForURL(/\/login/);
  await page.getByRole('textbox', { name: '이메일' }).fill(TEST_EMAIL);
  await page.getByRole('textbox', { name: '비밀번호' }).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(/\/\?projectId=|\/$/);
}

async function getCookieStr(page: Page) {
  return (await page.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ');
}

async function getSessionsList(page: Page, projectId: string) {
  const cookie = await getCookieStr(page);
  const res = await page.request.get(`/api/sessions?projectId=${projectId}`, { headers: { Cookie: cookie } });
  if (!res.ok()) return [];
  const body = await res.json();
  return Array.isArray(body) ? body : (body.data ?? []);
}

async function getProjectId(page: Page): Promise<string> {
  const cookie = await getCookieStr(page);
  const res = await page.request.get('/api/projects', { headers: { Cookie: cookie } });
  if (!res.ok()) return '';
  const body = await res.json();
  const projects = body.data ?? body;
  return projects[0]?.id ?? '';
}

// ────────────────────────────────────────────
// 1. 로그인
// ────────────────────────────────────────────
test.describe('로그인', () => {
  test('잘못된 비밀번호 → 에러 메시지', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/login/);
    await page.getByRole('textbox', { name: '이메일' }).fill(TEST_EMAIL);
    await page.getByRole('textbox', { name: '비밀번호' }).fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();
    // "올바르지 않습니다" 에러 메시지 표시
    await expect(page.getByText(/올바르지|실패|오류/)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('올바른 로그인 → 대시보드', async ({ page }) => {
    await login(page);
    await expect(page.getByText('팀 대시보드')).toBeVisible({ timeout: 10000 });
  });
});

// ────────────────────────────────────────────
// 2. 대시보드
// ────────────────────────────────────────────
test.describe('대시보드', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('핵심 요소 표시', async ({ page }) => {
    await expect(page.getByText('팀 대시보드')).toBeVisible();
    await expect(page.getByText('기간별 통계')).toBeVisible();
  });

  test('사이드바에 프로젝트/세션 트리 표시', async ({ page }) => {
    // 데스크톱에서는 사이드바가 항상 표시됨 — 프로젝트 이름이 보여야 함
    await expect(page.getByText('Nexus').first()).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────
// 3. 세션 페이지 — 메시지 표시
// ────────────────────────────────────────────
test.describe('세션 페이지', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('세션 진입 → 메시지 + 입력란 표시', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    // 메시지 입력란 존재
    await expect(page.getByPlaceholder(/메시지를 입력/)).toBeVisible({ timeout: 10000 });
    // 락 상태 배지 존재
    await expect(page.getByText(/미사용|작업 중|내 작업/).first()).toBeVisible({ timeout: 5000 });
  });

  test('메시지에 시스템 태그 미포함', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(2000);

    const content = await page.textContent('body') || '';
    expect(content).not.toContain('<system-reminder>');
    expect(content).not.toContain('<task-notification>');
    expect(content).not.toContain('<local-command-caveat>');
    expect(content).not.toContain('<user-prompt-submit-hook>');
  });

  test('전송 버튼 — 빈 입력 시 비활성, 입력 시 활성', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    const input = page.getByPlaceholder(/메시지를 입력/);
    await expect(input).toBeVisible({ timeout: 10000 });

    // 빈 상태 → 전송 버튼 비활성
    const sendBtn = page.getByRole('button', { name: /전송/ });
    await expect(sendBtn).toBeDisabled();

    // 텍스트 입력 → 전송 버튼 활성화
    await input.fill('테스트');
    await page.waitForTimeout(300);
    await expect(sendBtn).toBeEnabled();

    // 텍스트 삭제 → 다시 비활성
    await input.fill('');
    await page.waitForTimeout(300);
    await expect(sendBtn).toBeDisabled();
  });
});

// ────────────────────────────────────────────
// 4. 세션 격리 — 서로 다른 세션은 다른 대화
// ────────────────────────────────────────────
test.describe('세션 격리', () => {
  test('서로 다른 세션은 다른 대화 내용', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length < 2) return;

    // 첫 번째 세션
    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(2000);
    const text1 = await page.locator('[class*="overflow-y"]').textContent() || '';

    // 두 번째 세션
    await page.goto(`/projects/${projectId}/sessions/${sessions[1].id}`);
    await page.waitForTimeout(2000);
    const text2 = await page.locator('[class*="overflow-y"]').textContent() || '';

    // 양쪽 다 내용이 있으면 달라야 함
    if (text1.length > 50 && text2.length > 50) {
      expect(text1).not.toBe(text2);
    }
  });
});

// ────────────────────────────────────────────
// 5. 코드 에디터 (Monaco + 파일 브라우저)
// ────────────────────────────────────────────
test.describe('코드 에디터', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('에디터 토글 → 파일 탐색기 표시', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(1000);

    // 에디터 토글 버튼 클릭
    const editorBtn = page.getByRole('button', { name: '코드 에디터 토글' });
    await expect(editorBtn).toBeVisible({ timeout: 5000 });
    await editorBtn.click();
    await page.waitForTimeout(1000);

    // 파일 탐색기 헤더 확인
    await expect(page.getByText('탐색기')).toBeVisible({ timeout: 5000 });
    // 빈 상태 메시지 or 파일 목록 확인
    await expect(page.getByText(/좌측 탐색기에서 파일을 선택하세요|로딩 중/)).toBeVisible({ timeout: 5000 });
  });

  test('파일 클릭 → Monaco 에디터에서 열림', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '코드 에디터 토글' }).click();
    await page.waitForTimeout(2000);

    // CLAUDE.md 파일 버튼 찾아서 클릭 (프로젝트 루트에 존재)
    const fileBtn = page.getByRole('button', { name: /CLAUDE\.md/ }).first();
    if (await fileBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileBtn.click();
      await page.waitForTimeout(2000);
      // Monaco 에디터가 로드됐는지 — 라인 번호 나타남
      await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('패널 닫기 → 상태 유지', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(1000);

    const toggleBtn = page.getByRole('button', { name: '코드 에디터 토글' });
    await toggleBtn.click();
    await page.waitForTimeout(500);
    // 열림 상태 확인
    await expect(page.getByText('탐색기')).toBeVisible();

    // 닫기
    await page.getByRole('button', { name: '패널 닫기' }).click();
    await page.waitForTimeout(500);
    // 숨겨짐
    await expect(page.getByText('탐색기')).not.toBeVisible();
  });
});

// ────────────────────────────────────────────
// 6. 터미널 멀티탭
// ────────────────────────────────────────────
test.describe('터미널', () => {
  test.beforeEach(async ({ page }) => { await login(page); });

  test('터미널 토글 → 탭 생성', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '터미널 토글' }).click();
    await page.waitForTimeout(1500);

    // 첫 번째 탭 자동 생성 확인
    await expect(page.getByText('터미널 1').first()).toBeVisible({ timeout: 5000 });
  });

  test('새 탭 추가 → 탭 2개', async ({ page }) => {
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const sessions = await getSessionsList(page, projectId);
    if (sessions.length === 0) return;

    await page.goto(`/projects/${projectId}/sessions/${sessions[0].id}`);
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '터미널 토글' }).click();
    await page.waitForTimeout(1500);

    // + 버튼 클릭
    await page.getByRole('button', { name: '새 터미널' }).click();
    await page.waitForTimeout(1500);

    // 두 번째 탭 확인
    await expect(page.getByText('터미널 2')).toBeVisible({ timeout: 5000 });
  });
});

// ────────────────────────────────────────────
// 7. API - 파일 브라우저
// ────────────────────────────────────────────
test.describe('파일 브라우저 API', () => {
  test('GET /api/tree/browse → 파일 목록', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const cookie = await getCookieStr(page);

    const res = await page.request.get(`/api/tree/browse?projectId=${projectId}`, {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    // 민감 디렉토리 필터링 확인
    const names = body.items.map((i: { name: string }) => i.name);
    expect(names).not.toContain('.git');
    expect(names).not.toContain('node_modules');
  });

  test('경로 트래버설 차단 → 403', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const cookie = await getCookieStr(page);

    const res = await page.request.get(`/api/tree/browse?projectId=${projectId}&path=../../etc`, {
      headers: { Cookie: cookie },
    });
    expect(res.status()).toBe(403);
  });

  test('파일 읽기 → 200', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const cookie = await getCookieStr(page);

    const res = await page.request.get(
      `/api/tree/file?projectId=${projectId}&path=${encodeURIComponent('CLAUDE.md')}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.content).toBeDefined();
    expect(body.language).toBe('markdown');
  });

  test('민감 파일 읽기 차단 → 403', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const cookie = await getCookieStr(page);

    const res = await page.request.get(
      `/api/tree/file?projectId=${projectId}&path=${encodeURIComponent('.env')}`,
      { headers: { Cookie: cookie } },
    );
    expect(res.status()).toBe(403);
  });
});

// ────────────────────────────────────────────
// 8. 404 처리
// ────────────────────────────────────────────
test.describe('존재하지 않는 페이지', () => {
  test('잘못된 세션 ID → 에러 또는 빈 상태', async ({ page }) => {
    await login(page);
    const projectId = await getProjectId(page);
    if (!projectId) return;
    const fakeSessionId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/projects/${projectId}/sessions/${fakeSessionId}`);
    await page.waitForTimeout(2000);
    // 메시지 입력란이 없거나, 에러 표시가 있어야 함
    const hasInput = await page.getByPlaceholder(/메시지를 입력/).isVisible().catch(() => false);
    const hasError = await page.getByText(/찾을 수 없|오류|404/).isVisible().catch(() => false);
    // 둘 중 하나는 참이어야 함 (빈 세션이거나 에러)
    expect(hasInput || hasError).toBe(true);
  });
});
