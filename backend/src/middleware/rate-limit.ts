// Rate Limit 설정 — 엔드포인트별 요청 제한
import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

/**
 * 전역 기본 Rate Limit 등록 — 일반 API: 100회/분
 * 개별 라우트는 config.rateLimit으로 오버라이드 가능
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    // 전역 기본값: 1분당 100회
    max: 100,
    timeWindow: '1 minute',
    // 제한 초과 시 일관된 에러 형식 반환
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `요청이 너무 많습니다. ${Math.ceil(context.ttl / 1000)}초 후 다시 시도해주세요.`,
      },
    }),
    // 레이트 리밋 헤더 응답에 포함
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });
}

/** 채팅 엔드포인트 전용 Rate Limit 설정 — 10회/분 */
export const chatRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
} as const;
