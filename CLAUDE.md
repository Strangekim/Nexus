# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요
**Nexus** — 팀 전용 웹 기반 자연어 코딩 + PM 플랫폼.
모노레포 구조: `frontend/` (Next.js) + `backend/` (Fastify)
Claude Code CLI를 내부적으로 래핑하여, 웹에서 자연어로 AI에게 코딩을 지시하고 팀 단위로 협업한다.

## 기술 스택
- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Socket.IO Client, TanStack Query, Zustand
- **Backend**: Node.js + Fastify, TypeScript, Socket.IO, Prisma, simple-git, @fastify/session
- **DB**: PostgreSQL (Prisma ORM)
- **Infra**: EC2 호스트 직접 실행 (pm2), Nginx 리버스 프록시
- **인증**: httpOnly cookie 기반 세션 인증 (@fastify/session + connect-pg-simple)

## 핵심 설계 문서 (반드시 참조)
작업 전에 해당 영역의 문서를 반드시 읽고 따른다:

| 문서 | 경로 | 내용 |
|------|------|------|
| **API 명세** | `@docs/api-spec.md` | REST API 전체 명세, SSE 이벤트 스키마, WebSocket 이벤트, 설계 결정 사항 |
| **DB 스키마** | `@docs/db-schema.md` | Prisma 스키마, ER 관계, 인덱스, 삭제 정책 |
| **프론트엔드 설계** | `@docs/frontend-design.md` | 디자인 시스템(컬러/타이포/레이아웃), 라우트, 상태관리, SSE 파서, 컴포넌트 구조 |
| **기획서** | `@description.md` | 프로젝트 전체 개요, 기능, 아키텍처, 핵심 플로우 |

## 작업 계획서
현재 Phase별 구현 계획이 수립되어 있다. 작업 지시 시 해당 Phase 문서를 참조한다:

| Phase | 경로 | 핵심 내용 |
|-------|------|-----------|
| Phase 1: MVP | `@docs/plans/phase1-mvp.md` | 초기 세팅, DB, 인증, CRUD+사이드바, 채팅+CLI |
| Phase 2: 협업 | `@docs/plans/phase2-collaboration.md` | WebSocket, 세션 락, 이어받기, 알림 |
| Phase 3: 대시보드 | `@docs/plans/phase3-dashboard-git-pm.md` | Git 동기화, Merge, 대시보드, PM 질의 |
| Phase 4: 완성도 | `@docs/plans/phase4-polish.md` | 터미널, Skills 편집기, 사용자 관리, 반응형, 보안 |

각 Plan 문서에는 작업별 의존성, 병렬 처리 가능 여부, 충돌 파일 목록이 명시되어 있다.

## 코딩 컨벤션
- TypeScript strict mode 필수
- ESM (`import`/`export`) 사용, CommonJS 금지
- 함수형 컴포넌트 + React Hooks만 사용
- 변수/함수: `camelCase`, 컴포넌트: `PascalCase`, DB 컬럼: `snake_case`
- API 경로: `kebab-case` (예: `/api/session-lock`)
- JSON 프로퍼티: `camelCase`
- 에러 응답: `{ error: { code: string, message: string } }` 형식 통일
- 알림 type 값: `snake_case` (예: `lock_request`, `task_complete`)
- **모든 주석은 한글로 작성한다** (코드 내 주석, JSDoc, TODO 등 모두 한글)
- **파일당 60~100줄 초과 시 리팩토링을 검토한다**: 컴포넌트 분리, 훅 추출, 유틸 함수 분리, 서비스/라우트/스키마 파일 분리 등을 적용하여 파일 크기를 관리한다

## 코드 작성 패턴 (Skills 참조)
코드 작성 시 아래 Skills의 패턴을 따른다. 일관된 코드 구조를 유지하기 위해 반드시 참조:

| Skill | 설명 |
|-------|------|
| `nextjs-patterns` | Next.js App Router 페이지, 레이아웃, 클라이언트/서버 컴포넌트 패턴 |
| `fastify-routes` | Fastify 라우트 플러그인 구조, 스키마 검증, 서비스 레이어 분리 |
| `tanstack-query` | useQuery/useMutation 훅, API 함수 분리, queryKey 컨벤션 |
| `zustand-store` | 스토어 생성, persist 미들웨어, 슬라이스 패턴 |
| `socketio-client` | Socket.IO 서버 설정, 클라이언트 훅, 이벤트 구독 패턴 |

## 디자인 규칙
- **디자인 레퍼런스**: Claude Web / Claude Desktop UI를 최대한 참고
- **컬러**: Teal(`#2D7D7B`) ~ Coral(`#E0845E`) 그라데이션 기반 (상세: `@docs/frontend-design.md` 섹션 0)
- **다크 모드 기본**, 배경: `#1A1A2E`, 사이드바: `#0F3433`
- **로고**: `/logo.png` 사용, 심볼+워드마크 구성
- **아이콘**: `lucide-react`
- **컴포넌트**: shadcn/ui (Radix UI 기반)

## 명령어
- `cd frontend && npm run dev` — 프론트 개발 서버 (3000)
- `cd backend && npm run dev` — 백엔드 개발 서버 (8080)
- `cd backend && npx prisma migrate dev` — DB 마이그레이션
- `cd backend && npx prisma generate` — Prisma 타입 생성
- `cd backend && npx prisma studio` — DB GUI
- `cd frontend && npm run build` — 프론트 빌드
- `cd frontend && npm run lint` — 프론트 린트

## Git 규칙
- 매 작업 완료 시 반드시 커밋
- 커밋 메시지 형식: `[기능명] 작업 내용 요약`
- `.env` 파일은 절대 커밋하지 않는다
- 커밋 전 빌드 에러 없는지 확인
- force push 금지 — revert로 되돌리기

## 중요 규칙
- `.env`, `.env.local`, `.env.production` 파일은 절대 Git에 커밋 금지
- API 키, 시크릿 등 민감 정보를 코드에 하드코딩 금지
- 새 API 엔드포인트 추가 시 `@docs/api-spec.md` 업데이트
- DB 스키마 변경 시 Prisma migration 생성 필수
- 세션 인증은 httpOnly cookie 방식 (JWT 아님)
- worktree 경로 형식: `/home/ubuntu/projects-wt/{프로젝트명}/{세션ID}/`
- mergeStatus 값: `working` | `merged` | `conflict`

## 서브에이전트 작업 시 주의사항
- 병렬 서브에이전트가 같은 파일을 수정하면 충돌 발생 → Plan 문서의 "충돌 파일" 컬럼 확인
- 백엔드(`backend/src/`)와 프론트엔드(`frontend/src/`)는 파일 겹침이 없어 병렬 가능
- `package.json`, `layout.tsx`, 기존 서비스 파일 수정은 순차 처리

## Compact Instructions
컨텍스트 압축 시 반드시 보존할 정보:
- 현재 작업 중인 Phase 및 작업 번호 (예: Phase 1.3)
- 현재 작업 중인 파일 경로와 변경 내용
- 미완료 작업 목록과 다음 단계
- 발견된 버그나 이슈
- 참조 중인 설계 문서 경로
