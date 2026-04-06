/**
 * @module routes/auth/claude-oauth
 * @description Claude OAuth 2.0 PKCE 인증 라우트
 *
 * MANUAL 모드: 사용자가 Claude 인증 URL에서 code를 직접 복사해 붙여넣음.
 * PKCE code_verifier는 인메모리 맵에 저장 — DB/로그 기록 절대 금지.
 *
 * 세션 쿠키 대신 인메모리 맵을 사용하는 이유:
 * 프론트(:3000) ↔ 백엔드(:8080) 크로스오리진 환경에서
 * sameSite: 'lax' 쿠키가 POST 요청 시 전달되지 않아 세션이 유실될 수 있음.
 */
import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { requireAuth } from '../../plugins/auth.js';
import { claudeAuthService } from '../../services/claude-auth.service.js';
import prisma from '../../lib/prisma.js';
import { setPkce, getPkce, deletePkce } from '../../lib/oauth-pkce-store.js';

const claudeOAuthRoute: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/claude/start
   * OAuth 흐름 시작 — PKCE 파라미터 생성 후 인증 URL 반환.
   * code_verifier는 인메모리 맵에만 저장, 응답/DB/로그에 포함하지 않음.
   */
  fastify.post('/claude/start', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.userId;
    const codeVerifier = claudeAuthService.generateCodeVerifier();
    const codeChallenge = claudeAuthService.generateCodeChallenge(codeVerifier);
    // CSRF 방어용 state — 32바이트 랜덤 hex
    const state = crypto.randomBytes(32).toString('hex');

    // 인메모리 맵에 저장 (세션 쿠키 크로스오리진 문제 우회, DB/로그 기록 금지)
    setPkce(userId, codeVerifier, state);

    const authUrl = claudeAuthService.generateAuthUrl(state, codeChallenge);

    return { authUrl };
  });

  /**
   * POST /api/auth/claude/callback
   * 사용자가 붙여넣은 code로 토큰 교환 + credentials.json 저장.
   * body: { code: string } — code 값 또는 callback 전체 URL 허용.
   */
  fastify.post<{ Body: { code: string } }>(
    '/claude/callback',
    {
      preHandler: [requireAuth],
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          additionalProperties: false,
          properties: {
            // 사용자가 전체 URL을 붙여넣는 경우도 허용
            code: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.userId;

      // 인메모리 맵에서 PKCE 파라미터 조회 (세션 쿠키 크로스오리진 문제 우회)
      const pkce = getPkce(userId);

      if (!pkce) {
        return reply.code(400).send({
          error: { code: 'OAUTH_SESSION_EXPIRED', message: 'OAuth 세션이 만료되었습니다. 다시 시작해주세요.' },
        });
      }

      const { codeVerifier, state: savedState } = pkce;

      // URL이 들어온 경우 code + state 파라미터 추출 후 CSRF 검증
      let rawCode = request.body.code.trim();
      if (rawCode.startsWith('http')) {
        try {
          const url = new URL(rawCode);
          const urlState = url.searchParams.get('state');
          // URL에 state가 포함된 경우 저장된 state와 비교 (CSRF 방어)
          if (urlState && urlState !== savedState) {
            return reply.code(400).send({
              error: { code: 'OAUTH_STATE_MISMATCH', message: 'OAuth state 값이 일치하지 않습니다. 다시 시작해주세요.' },
            });
          }
          rawCode = url.searchParams.get('code') ?? rawCode;
        } catch {
          // URL 파싱 실패 → 원본 사용
        }
      }

      // 1회용 — 교환 전 즉시 삭제 (재사용 방지)
      deletePkce(userId);

      let tokens;
      try {
        tokens = await claudeAuthService.exchangeToken(rawCode, codeVerifier, savedState);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '토큰 교환 오류';
        return reply.code(400).send({
          error: { code: 'OAUTH_EXCHANGE_FAILED', message: msg },
        });
      }

      // credentials.json 저장 (파일 권한 600)
      await claudeAuthService.saveCredentials(userId, tokens);

      // DB에 연동 상태 표시 ("oauth_connected") — 토큰 자체는 저장 안 함
      await prisma.user.update({
        where: { id: userId },
        data: { claudeAccount: 'oauth_connected' },
      });

      // subscriptionType은 scope에서 추론 (향후 /me API에서 실제 플랜 조회 가능)
      return { success: true, subscriptionType: 'max' };
    },
  );

  /**
   * POST /api/auth/claude/disconnect
   * OAuth 연동 해제 — credentials.json 삭제 + DB 초기화.
   */
  fastify.post('/claude/disconnect', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.userId;

    await claudeAuthService.removeCredentials(userId);

    await prisma.user.update({
      where: { id: userId },
      data: { claudeAccount: null },
    });

    return { success: true };
  });

  /**
   * GET /api/auth/claude/status
   * 연동 상태 확인 — credentials.json 존재 여부 + 토큰 만료 확인.
   * 토큰 값 자체는 응답에 포함하지 않음.
   */
  fastify.get('/claude/status', { preHandler: [requireAuth] }, async (request) => {
    const userId = request.userId;
    const creds = await claudeAuthService.getCredentials(userId);

    if (!creds) {
      return { connected: false };
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = creds.expires_at <= now;

    return {
      connected: true,
      subscriptionType: 'max',
      expiresAt: creds.expires_at,
      isExpired,
    };
  });
};

export default claudeOAuthRoute;
