/**
 * @module services/claude-auth
 * @description Claude OAuth 2.0 + PKCE 인증 서비스
 * credentials.json을 사용자별 디렉토리에 저장하여 CLI 실행 시 주입한다.
 *
 * 보안 원칙:
 * - code_verifier는 세션에만 존재, DB/로그 기록 절대 금지
 * - credentials.json 파일 권한 0o600 (소유자만 읽기/쓰기)
 * - 디렉토리 권한 0o700 (소유자만 접근)
 * - 토큰은 API 응답에 절대 포함하지 않음
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/** Claude 공식 OAuth client_id (Claude Code) */
const CLAUDE_CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';

/** OAuth 토큰 교환 엔드포인트 */
const CLAUDE_TOKEN_URL = 'https://claude.ai/oauth/token';

/** MANUAL 모드 redirect_uri (사용자가 code를 직접 붙여넣음) */
const REDIRECT_URI = 'https://platform.claude.com/oauth/code/callback';

/** Claude 구독 기반 scope */
const OAUTH_SCOPE = 'user:inference user:profile user:sessions:claude_code';

/** 사용자별 Claude 설정 디렉토리 루트 */
const CONFIG_BASE_DIR = '/home/ubuntu/claude-configs';

/** OAuth 토큰 응답 타입 */
export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  /** 만료 시각 (Unix timestamp, 초 단위) */
  expires_at: number;
  scope?: string;
}

class ClaudeAuthService {
  /**
   * PKCE code_verifier 생성 (43~128자 랜덤 URL-safe 문자열).
   * RFC 7636 준수.
   */
  generateCodeVerifier(): string {
    // 32바이트 → 43자 base64url (패딩 제거)
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * code_verifier → SHA-256 → base64url 변환 (S256 메서드).
   */
  generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * OAuth 인증 URL 생성 (MANUAL 모드 — 사용자가 code를 직접 복사).
   */
  generateAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: CLAUDE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: OAUTH_SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://claude.ai/oauth/authorize?${params.toString()}`;
  }

  /**
   * authorization code → 토큰 교환.
   * 교환 성공 시 expires_at을 계산하여 OAuthTokens에 포함.
   * @throws 토큰 교환 실패 시 Error
   */
  async exchangeToken(code: string, codeVerifier: string, state: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLAUDE_CLIENT_ID,
      code_verifier: codeVerifier,
      state,
    });

    const res = await fetch(CLAUDE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      // 에러 본문을 로그에 남기지 않음 (토큰 정보 노출 방지)
      throw new Error(`토큰 교환 실패: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in?: number;
      scope?: string;
    };

    const expiresIn = data.expires_in ?? 3600;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      scope: data.scope,
    };
  }

  /**
   * refresh_token → 새 access_token 발급.
   * @throws 갱신 실패 시 Error
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLAUDE_CLIENT_ID,
    });

    const res = await fetch(CLAUDE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`토큰 갱신 실패: HTTP ${res.status}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in?: number;
      scope?: string;
    };

    const expiresIn = data.expires_in ?? 3600;
    return {
      access_token: data.access_token,
      // refresh_token이 새로 발급되지 않으면 기존 것 유지
      refresh_token: data.refresh_token ?? refreshToken,
      token_type: data.token_type,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      scope: data.scope,
    };
  }

  /**
   * credentials.json 저장.
   * 디렉토리: /home/ubuntu/claude-configs/{userId}/
   * 파일 권한: 0o600 (소유자 읽기/쓰기만)
   * 디렉토리 권한: 0o700 (소유자만 접근)
   */
  async saveCredentials(userId: string, tokens: OAuthTokens): Promise<void> {
    const dir = this.getConfigDir(userId);
    // 디렉토리 없으면 생성 (권한 700)
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    // 권한이 이미 설정된 디렉토리여도 강제 적용
    await fs.chmod(dir, 0o700);

    const credPath = path.join(dir, '.credentials.json');
    await fs.writeFile(credPath, JSON.stringify(tokens), { encoding: 'utf8', mode: 0o600 });
    // 파일 권한 재확인 (umask 무시 보장)
    await fs.chmod(credPath, 0o600);
  }

  /**
   * credentials.json 읽기.
   * 파일이 없으면 null 반환.
   */
  async getCredentials(userId: string): Promise<OAuthTokens | null> {
    const credPath = path.join(this.getConfigDir(userId), '.credentials.json');
    try {
      const raw = await fs.readFile(credPath, 'utf8');
      return JSON.parse(raw) as OAuthTokens;
    } catch {
      // 파일 없음 또는 파싱 오류 → 미연동 상태
      return null;
    }
  }

  /**
   * credentials.json 삭제 (OAuth 연동 해제).
   * 파일이 없어도 오류 발생하지 않음.
   */
  async removeCredentials(userId: string): Promise<void> {
    const credPath = path.join(this.getConfigDir(userId), '.credentials.json');
    await fs.unlink(credPath).catch(() => {/* 이미 없으면 무시 */});
  }

  /**
   * 토큰 유효성 확인 + 필요 시 자동 갱신.
   * - 만료 5분 전부터 갱신 시도
   * - 갱신 실패 시 null 반환 (재인증 필요)
   * @returns 유효한 access_token, 인증 정보 없으면 null
   */
  async ensureValidToken(userId: string): Promise<string | null> {
    const creds = await this.getCredentials(userId);
    if (!creds) return null;

    const now = Math.floor(Date.now() / 1000);
    // 5분(300초) 여유를 두고 갱신 판단
    const isExpiringSoon = creds.expires_at - now < 300;

    if (!isExpiringSoon) {
      return creds.access_token;
    }

    try {
      const refreshed = await this.refreshToken(creds.refresh_token);
      await this.saveCredentials(userId, refreshed);
      return refreshed.access_token;
    } catch {
      // 갱신 실패 → credentials 제거, 재인증 유도
      await this.removeCredentials(userId);
      return null;
    }
  }

  /**
   * 사용자별 Claude 설정 디렉토리 경로 반환.
   */
  getConfigDir(userId: string): string {
    return path.join(CONFIG_BASE_DIR, userId);
  }
}

export const claudeAuthService = new ClaudeAuthService();
