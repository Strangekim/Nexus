// HTTP 에러 생성 유틸리티 — statusCode를 가진 Error 객체를 반환

/**
 * statusCode가 포함된 Error 객체를 생성한다
 * Fastify 전역 에러 핸들러에서 statusCode를 읽어 적절한 응답을 반환한다
 * @param statusCode HTTP 상태 코드
 * @param message 에러 메시지
 * @param extra 추가 속성 (예: code 필드)
 */
export function createHttpError(
  statusCode: number,
  message: string,
  extra?: Record<string, unknown>,
): Error {
  return Object.assign(new Error(message), { statusCode, ...extra });
}
