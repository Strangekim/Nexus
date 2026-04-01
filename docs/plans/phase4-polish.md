# Phase 4: 완성도 (1~2주)

> 목표: 터미널 뷰어, Skills 편집기, 사용자 관리, 모바일 반응형, 에러 핸들링 강화

---

## 4.1 터미널/로그 뷰어

### 목표
AI가 실행한 명령어와 결과를 xterm.js 터미널 스타일로 실시간 표시

### 구현 파일
```
frontend/src/
├── components/
│   ├── terminal/
│   │   ├── TerminalPanel.tsx    -- 터미널 dynamic import 래퍼
│   │   └── TerminalInnerClient.tsx -- xterm.js 실제 구현
│   └── session/
│       └── SessionLayout.tsx    -- 채팅 + 터미널 분할 패널 (ResizablePanelGroup)
```

### 구현 단계

1. **프론트엔드: xterm.js 통합**
   - `next/dynamic`으로 SSR 비활성화 동적 임포트
   - xterm.js Terminal 인스턴스 + FitAddon
   - `ResizeObserver`로 패널 크기 변경 시 자동 fit
   - 읽기 전용 (`disableStdin: true`)

2. **프론트엔드: SSE 이벤트 연동**
   - `tool_use_begin` → 터미널에 `$ {도구명}` 출력 (녹색)
   - `tool_use_input` → 입력 내용 표시 (파일 경로, 명령어 등)
   - `tool_result` → 결과 표시 (성공: 흰색, 에러: 빨강)
   - ANSI 컬러 코드 활용하여 시각적 구분

3. **프론트엔드: 패널 분할**
   - `react-resizable-panels` (shadcn/ui ResizablePanelGroup)
   - 채팅 | 터미널 수직 분할
   - 터미널 접기(collapse) 가능
   - 패널 크기 Zustand에 저장 (uiStore)

### 의존성
- Phase 1 (채팅 SSE 스트리밍)

### 완료 기준
- [ ] 채팅 하단에 터미널 패널 표시
- [ ] AI 도구 사용 시 명령/결과 실시간 표시
- [ ] 드래그로 패널 크기 조절 가능
- [ ] 터미널 패널 접기/펼치기 동작
- [ ] 에러 로그 빨간색 하이라이팅

---

## 4.2 Skills / CLAUDE.md 웹 편집기

### 목표
프로젝트의 CLAUDE.md와 .claude/skills.md를 Monaco Editor로 웹에서 편집

### 구현 파일
```
backend/src/routes/projects/
└── skills/
    ├── claude-md.ts             -- GET/PUT /api/projects/:id/skills/claude-md
    └── skills-md.ts             -- GET/PUT /api/projects/:id/skills/skills-md

frontend/src/
├── app/(main)/projects/[projectId]/
│   └── settings/
│       └── page.tsx             -- Skills 편집 페이지
├── components/
│   └── editor/
│       ├── MonacoEditor.tsx     -- Monaco Editor dynamic import 래퍼
│       └── SkillsEditor.tsx     -- CLAUDE.md / skills.md 탭 편집기
```

### 구현 단계

1. **백엔드: Skills API**
   - `GET /api/projects/:id/skills/claude-md`: `fs.readFile(repoPath + '/CLAUDE.md')` → 내용 반환
   - `PUT /api/projects/:id/skills/claude-md`: `fs.writeFile()` → 저장
   - `GET /api/projects/:id/skills/skills-md`: `.claude/skills.md` 읽기
   - `PUT /api/projects/:id/skills/skills-md`: `.claude/skills.md` 저장
   - 파일 존재하지 않을 경우 빈 문자열 반환 (404 대신)
   - `lastModified`: `fs.stat().mtime` 반환

2. **프론트엔드: Monaco Editor**
   - `next/dynamic` + `ssr: false`
   - 마크다운 언어 모드
   - 다크 테마 (`vs-dark`)
   - 자동 저장 (debounce 2초) 또는 저장 버튼

3. **프론트엔드: 편집 페이지**
   - 탭: CLAUDE.md / skills.md 전환
   - 저장 상태 표시 ("저장됨" / "저장 중..." / "변경사항 있음")
   - 저장 성공 토스트 알림

### 의존성
- Phase 1 (프로젝트 CRUD)

### 완료 기준
- [ ] Monaco Editor에서 CLAUDE.md 편집 + 저장
- [ ] skills.md 편집 + 저장
- [ ] 저장 후 다음 Claude Code 세션에 반영 확인
- [ ] 파일 미존재 시 빈 에디터 표시 (에러 없음)

---

## 4.3 사용자 관리 (관리자 전용)

### 목표
관리자가 웹 UI에서 팀원 추가/수정/삭제, 역할 변경, 인증 모드 전환

### 구현 파일
```
backend/src/routes/
└── users/
    ├── index.ts                 -- GET/POST /api/users
    └── [id].ts                  -- GET/PATCH/DELETE /api/users/:id

frontend/src/
├── app/(main)/admin/
│   └── users/
│       └── page.tsx             -- 사용자 관리 페이지
├── components/
│   └── admin/
│       ├── UserTable.tsx        -- 사용자 목록 테이블
│       ├── CreateUserDialog.tsx -- 사용자 추가 다이얼로그
│       └── EditUserDialog.tsx   -- 사용자 수정 다이얼로그
```

### 구현 단계

1. **백엔드: 사용자 CRUD**
   - 관리자 권한 체크 미들웨어 (`role === 'admin'`)
   - `POST /api/users`: 비밀번호 bcrypt 해싱 → 사용자 생성
   - `PATCH /api/users/:id`: 역할 변경, authMode 전환
   - `DELETE /api/users/:id`: SetNull 정책으로 관련 데이터 보존

2. **프론트엔드: 관리 페이지**
   - 사용자 목록 테이블 (DataTable 스타일)
   - 추가 다이얼로그: 이름, 이메일, 비밀번호, 역할, 리눅스 유저명, 인증 모드
   - 수정 다이얼로그: 역할 변경, authMode 전환 (subscription ↔ api)
   - 삭제 확인 다이얼로그
   - 관리자가 아닌 사용자 접근 시 403 또는 리다이렉트

### 의존성
- Phase 1 (인증)

### 완료 기준
- [ ] 관리자가 사용자 추가/수정/삭제 가능
- [ ] 역할(admin/member) 변경 가능
- [ ] 인증 모드(subscription/api) 전환 가능
- [ ] 일반 사용자 접근 차단

---

## 4.4 모바일 반응형

### 목표
모바일에서 대시보드 확인, 세션 열람, 알림 확인, 간단한 지시 가능

### 구현 파일
```
frontend/src/
├── components/
│   └── sidebar/
│       └── Sidebar.tsx          -- Sheet(드로어) 모드 추가
├── app/(main)/
│   └── layout.tsx               -- 반응형 분기
```

### 구현 단계

1. **사이드바 → 모바일 드로어**
   - PC: 고정 사이드바 (좌측)
   - 모바일: `Sheet` 컴포넌트 (햄버거 메뉴로 열기)
   - `useMediaQuery` 또는 Tailwind breakpoint 분기

2. **채팅 페이지 반응형**
   - 터미널 패널 모바일에서 기본 숨김
   - 메시지 입력창 하단 고정
   - 코드 블록 가로 스크롤

3. **대시보드 반응형**
   - PC: 2~3 컬럼 그리드
   - 모바일: 1 컬럼 스택
   - 차트 크기 자동 조절

4. **알림 페이지**
   - 모바일에서도 알림 목록 접근 가능
   - 알림 클릭 → 해당 세션으로 이동

### 의존성
- Phase 1~3 주요 UI 완성 후

### 완료 기준
- [ ] 모바일에서 사이드바 드로어로 동작
- [ ] 채팅 페이지 모바일에서 사용 가능
- [ ] 대시보드 모바일에서 정상 표시
- [ ] 알림 확인 + 세션 이동 가능

---

## 4.5 에러 핸들링 + 보안 강화

### 목표
전체 시스템의 안정성과 보안성 강화

### 구현 파일
```
backend/src/
├── plugins/
│   └── error-handler.ts         -- 글로벌 에러 핸들러
├── middleware/
│   └── rate-limit.ts            -- Rate limiting

frontend/src/
├── components/
│   └── common/
│       ├── ErrorBoundary.tsx    -- React Error Boundary
│       └── ErrorFallback.tsx    -- 에러 화면
├── app/
│   ├── error.tsx                -- Next.js 에러 페이지
│   └── not-found.tsx            -- 404 페이지
```

### 구현 단계

1. **백엔드: 글로벌 에러 핸들러**
   - Fastify `setErrorHandler`: 일관된 에러 응답 형식
   - 예상치 못한 에러 → 500 + 로깅 (민감 정보 제외)
   - Prisma 에러 → 적절한 HTTP 상태 코드 변환

2. **백엔드: 입력 검증**
   - Fastify JSON Schema 또는 Zod로 요청 body 검증
   - SQL injection 방지 (Prisma가 기본 처리하지만 raw query 주의)

3. **백엔드: Rate Limiting**
   - `@fastify/rate-limit`: API 엔드포인트별 요청 제한
   - 로그인: 5회/분
   - 채팅: 10회/분
   - 일반 API: 100회/분

4. **백엔드: CLI 실행 보안**
   - `--allowedTools` 옵션으로 도구 제한
   - 코딩 세션: 전체 도구 허용
   - PM 질의: `Read,Glob,Grep` 만 허용
   - 환경변수에 민감 정보 노출 방지

5. **프론트엔드: Error Boundary**
   - React Error Boundary로 컴포넌트 크래시 방지
   - 에러 화면에 "다시 시도" 버튼
   - `app/error.tsx`: 페이지 레벨 에러 처리
   - `app/not-found.tsx`: 404 페이지

6. **프론트엔드: 네트워크 에러 처리**
   - TanStack Query의 `onError` 글로벌 핸들러
   - 401 → 로그인 리다이렉트
   - 네트워크 오프라인 → 배너 표시
   - SSE 끊김 → 재연결 (지수 백오프)

### 의존성
- 모든 Phase 기능 구현 후

### 완료 기준
- [ ] 모든 API에 일관된 에러 응답 형식
- [ ] 입력 검증으로 잘못된 요청 차단
- [ ] Rate limiting 동작
- [ ] CLI 실행 시 `--allowedTools` 적용
- [ ] 프론트 크래시 시 Error Boundary 표시
- [ ] 네트워크 에러 시 적절한 UI 표시

---

## Phase 4 작업 순서 · 의존성 · 병렬 가능 여부

### 의존성 그래프

```
Phase 1~3 완료
 ├──→ 4.1 터미널 뷰어
 ├──→ 4.2 Skills 편집기
 ├──→ 4.3 사용자 관리
 ├──→ 4.4 모바일 반응형
 └──→ 4.5 에러 핸들링 + 보안 (4.1~4.4 완료 후)
```

### 작업별 병렬 처리 가능 여부

| 작업 | 선행 작업 | 병렬 분리 가능? | 분리 방법 | 충돌 파일 |
|------|-----------|:---:|-----------|-----------|
| 4.1 터미널 — 프론트 | Phase 1 (채팅) | **독립** ✅ | 새 컴포넌트 생성만 | `frontend/src/components/terminal/` |
| 4.1 터미널 — SessionLayout 수정 | Phase 1 | ⚠️ **주의** | `SessionLayout.tsx` 수정 | 4.4와 같은 파일 수정 가능 |
| 4.2 Skills — 백엔드 | Phase 1 (프로젝트) | **독립** ✅ | 새 라우트 생성만 | `backend/src/routes/projects/skills/` |
| 4.2 Skills — 프론트 | Phase 1 | **독립** ✅ | 새 페이지+컴포넌트 | `frontend/src/app/(main)/projects/[projectId]/settings/` |
| 4.3 사용자관리 — 백엔드 | Phase 1 (인증) | **독립** ✅ | 새 라우트 | `backend/src/routes/users/` |
| 4.3 사용자관리 — 프론트 | Phase 1 | **독립** ✅ | 새 페이지 | `frontend/src/app/(main)/admin/` |
| 4.4 모바일 반응형 | Phase 1~3 UI | ⚠️ **주의** | 기존 레이아웃 파일 수정 | `layout.tsx`, `Sidebar.tsx` 등 기존 파일 |
| 4.5 에러/보안 | 4.1~4.4 | **불가** | 기존 코드 전반 수정 | 다수 파일 |
| **4.1 vs 4.2 vs 4.3** | 서로 독립 | **병렬 가능** ✅ | 전혀 다른 디렉토리 | 충돌 없음 |
| **4.4 vs 4.1~4.3** | 기존 파일 수정 | ⚠️ **순차 권장** | 레이아웃 등 공유 파일 존재 | `layout.tsx`, `Sidebar.tsx` |

### 최적 실행 계획 (단일 에이전트)

```
Step 1: 4.1 + 4.2 + 4.3 [최대 병렬]
        - 4.1 프론트: TerminalPanel, TerminalInnerClient (새 파일만)
        - 4.2 백엔드: skills 라우트 (새 파일만)
        - 4.2 프론트: settings 페이지 + MonacoEditor (새 파일만)
        - 4.3 백엔드: users 라우트 (새 파일만)
        - 4.3 프론트: admin 페이지 (새 파일만)
        ⚠️ 4.1의 SessionLayout.tsx 수정은 별도 순차 처리

Step 2: 4.1 SessionLayout 통합 + 4.4 모바일 반응형 (순차)
        - 기존 파일 수정이므로 병렬 불가
        - SessionLayout에 터미널 패널 분할 추가
        - layout.tsx, Sidebar.tsx에 반응형 분기 추가

Step 3: 4.5 에러 핸들링 + 보안 (순차 — 전체 코드 점검)
```

**예상 Step 수: 3**
