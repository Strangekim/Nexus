---
name: api-conventions
description: Nexus REST API 설계 규칙
---
# API 설계 규칙

- URL 경로: kebab-case (예: /api/session-lock)
- JSON 프로퍼티: camelCase
- 목록 API는 항상 페이지네이션 포함: `{ data: [], pagination: { page, limit, total, totalPages } }`
- 에러 응답 형식: `{ error: { code: string, message: string } }`
- 인증: httpOnly cookie 기반 세션 인증 (`@fastify/session` + `connect-pg-simple`)
- 모든 인증 필요 API는 세션 쿠키 검증 필수 (프론트에서 `credentials: 'include'`)
- 세션 만료 시 401 Unauthorized 반환
- 상세 명세: `@docs/api-spec.md` 참조
