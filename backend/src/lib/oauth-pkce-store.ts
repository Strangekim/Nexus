/**
 * @module lib/oauth-pkce-store
 * @description OAuth PKCE 파라미터 임시 인메모리 저장소.
 *
 * 크로스오리진 환경(프론트 :3000 ↔ 백엔드 :8080)에서는
 * sameSite: 'lax' 쿠키가 POST 요청 시 전달되지 않아 세션 기반 저장이 불안정.
 * userId를 키로 PKCE 파라미터를 메모리에 저장하여 세션 의존성을 제거한다.
 *
 * 보안 원칙:
 * - code_verifier는 메모리에만 존재, DB/로그 기록 절대 금지
 * - 10분 TTL — 만료 후 자동 삭제
 * - callback 성공 시 즉시 1회용 삭제
 */

/** PKCE 파라미터 항목 */
interface PkceEntry {
  codeVerifier: string;
  state: string;
  /** 만료 시각 (ms) */
  expiresAt: number;
}

/** 유효 시간 — 10분 */
const TTL_MS = 10 * 60 * 1000;

/** userId → PKCE 파라미터 맵 */
const store = new Map<string, PkceEntry>();

/**
 * PKCE 파라미터 저장.
 * 동일 userId가 재시작하면 덮어씀 (1개만 유지).
 */
export function setPkce(userId: string, codeVerifier: string, state: string): void {
  store.set(userId, {
    codeVerifier,
    state,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * PKCE 파라미터 조회.
 * 만료된 항목은 null 반환 후 자동 삭제.
 */
export function getPkce(userId: string): { codeVerifier: string; state: string } | null {
  const entry = store.get(userId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    // 만료 → 즉시 삭제
    store.delete(userId);
    return null;
  }

  return { codeVerifier: entry.codeVerifier, state: entry.state };
}

/**
 * PKCE 파라미터 삭제 (callback 성공 시 1회용 삭제).
 */
export function deletePkce(userId: string): void {
  store.delete(userId);
}

/**
 * 만료된 항목 정리 (메모리 누수 방지).
 * 서버에서 주기적으로 호출한다.
 */
export function pruneExpiredPkce(): void {
  const now = Date.now();
  for (const [userId, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(userId);
    }
  }
}
