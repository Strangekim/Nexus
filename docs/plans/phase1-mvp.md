# Phase 1: MVP (2~3주)

> 목표: 웹에서 자연어로 AI에게 코딩을 지시하고, 실시간 스트리밍 응답을 받는 핵심 루프 완성

---

## 1.1 프로젝트 초기 세팅

### 목표
모노레포 구조(frontend + backend) 초기화, 공통 설정 파일 구성

### 구현 파일
```
Nexus/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.local.example
│   └── src/
│       ├── app/
│       │   └── layout.tsx
│       ├── lib/
│       └── components/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts              -- Fastify 엔트리포인트
│       ├── config/
│       │   └── env.ts            -- 환경변수 로딩 + 검증
│       ├── plugins/              -- Fastify 플러그인
│       └── routes/
├── .gitignore
├── .env.example
└── CLAUDE.md
```

### 구현 단계

1. **프론트엔드 초기화**
   - `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir`
   - shadcn/ui 초기화: `npx shadcn@latest init`
   - 필수 패키지 설치:
     ```
     socket.io-client @tanstack/react-query zustand
     ```
   - `tsconfig.json` strict mode 확인
   - `.env.local.example` 작성: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

2. **백엔드 초기화**
   - `npm init` + TypeScript 설정
   - 필수 패키지 설치:
     ```
     fastify @fastify/cors @fastify/cookie @fastify/session
     @fastify/websocket socket.io prisma @prisma/client
     simple-git connect-pg-simple bcrypt
     ```
   - dev 패키지: `typescript tsx @types/node @types/bcrypt`
   - `tsconfig.json`: `"module": "ESNext"`, `"moduleResolution": "Node16"`, strict mode
   - Fastify 엔트리포인트 (`src/index.ts`): 기본 서버 기동 + CORS + 쿠키 플러그인

3. **공통 설정**
   - `.gitignore`: `node_modules/`, `.env`, `.env.local`, `dist/`, `.next/`
   - 루트 README.md (선택)
   - ESLint + Prettier 설정 (선택, 팀 합의 후)

### 의존성
- 없음 (최초 작업)

### 완료 기준
- [ ] `cd frontend && npm run dev` → localhost:3000 접속 가능
- [ ] `cd backend && npm run dev` → localhost:8080 접속 가능
- [ ] TypeScript strict mode 에러 없음
- [ ] Git 커밋 완료

---

## 1.2 DB 스키마 + Prisma 세팅

### 목표
PostgreSQL 연결 + Prisma 스키마 정의 + 초기 마이그레이션 실행

### 구현 파일
```
backend/
├── prisma/
│   ├── schema.prisma            -- 전체 스키마 (docs/db-schema.md 기반)
│   └── migrations/              -- 자동 생성
├── src/
│   ├── lib/
│   │   └── prisma.ts            -- PrismaClient 싱글턴
│   └── seed.ts                  -- 초기 관리자 계정 시드
└── .env                         -- DATABASE_URL
```

### 구현 단계

1. **PostgreSQL 설치/실행**
   - EC2에 PostgreSQL 호스트 직접 설치 (`apt install postgresql`)
   - DB 생성: `CREATE DATABASE nexus;`
   - `.env`에 `DATABASE_URL="postgresql://user:pass@localhost:5432/nexus"` 설정

2. **Prisma 초기화**
   - `npx prisma init`
   - `docs/db-schema.md`의 Prisma 스키마를 `prisma/schema.prisma`에 그대로 복사
   - 모델: User, UserSession, Project, ProjectMember, Folder, Session, Message, Commit, UsageLog, Notification

3. **마이그레이션 실행**
   - `npx prisma migrate dev --name init`
   - 생성된 테이블 확인

4. **PrismaClient 싱글턴**
   ```typescript
   // src/lib/prisma.ts
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   export default prisma;
   ```

5. **시드 데이터**
   - 관리자 계정 1개 생성 (bcrypt로 비밀번호 해싱)
   - `package.json`에 `"prisma": { "seed": "tsx src/seed.ts" }` 추가

### 의존성
- 1.1 프로젝트 초기 세팅

### 완료 기준
- [ ] `npx prisma migrate dev` 성공
- [ ] `npx prisma studio`로 테이블 확인 가능
- [ ] 시드 실행 후 관리자 계정 조회 가능
- [ ] `connect-pg-simple`용 `user_sessions` 테이블 존재

---

## 1.3 인증 시스템 (세션 기반)

### 목표
httpOnly cookie 기반 세션 인증 구현 (로그인/로그아웃/me)

### 구현 파일
```
backend/src/
├── plugins/
│   ├── session.ts               -- @fastify/session + connect-pg-simple 설정
│   └── auth.ts                  -- 인증 미들웨어 (preHandler)
├── routes/
│   └── auth/
│       ├── index.ts             -- 라우트 등록
│       ├── login.ts             -- POST /api/auth/login
│       ├── logout.ts            -- POST /api/auth/logout
│       └── me.ts                -- GET /api/auth/me

frontend/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           -- 인증 레이아웃 (중앙 정렬)
│   │   └── login/
│   │       └── page.tsx         -- 로그인 페이지
│   └── (main)/
│       └── layout.tsx           -- 인증 후 레이아웃 (사이드바)
├── contexts/
│   └── AuthContext.tsx          -- 인증 상태 Context
├── lib/
│   └── api.ts                   -- fetchWithAuth 유틸
└── middleware.ts                -- Next.js 미들웨어 (쿠키 체크)
```

### 구현 단계

1. **백엔드: 세션 플러그인**
   - `@fastify/session` + `@fastify/cookie` 설정
   - `connect-pg-simple`로 PostgreSQL 세션 스토어 연결
   - 쿠키 옵션: `httpOnly: true`, `secure: false (개발)`, `sameSite: 'lax'`, `maxAge: 24h`
   - 세션에 `userId` 저장

2. **백엔드: 인증 라우트**
   - `POST /api/auth/login`: email + password → bcrypt.compare → 세션 생성 → Set-Cookie
   - `POST /api/auth/logout`: 세션 삭제 → 쿠키 만료
   - `GET /api/auth/me`: 세션에서 userId 추출 → User 조회 → 반환
   - 에러 처리: 401 Unauthorized, 잘못된 자격증명

3. **백엔드: 인증 미들웨어**
   - `preHandler` 훅으로 세션 유효성 검사
   - `request.userId`에 사용자 ID 주입
   - 공개 경로(`/api/auth/login`) 제외

4. **프론트엔드: 로그인 페이지**
   - 이메일/비밀번호 폼 (shadcn/ui Input, Button)
   - `credentials: 'include'`로 쿠키 수신
   - 성공 시 `/dashboard`로 리다이렉트

5. **프론트엔드: AuthContext**
   - `GET /api/auth/me`로 초기 로딩 시 사용자 정보 조회
   - `user`, `isLoading`, `login()`, `logout()` 제공
   - `authMode: 'subscription' | 'api'` 타입 정의

6. **프론트엔드: Next.js Middleware**
   - `connect.sid` 쿠키 존재 여부로 보호 라우트 체크
   - 미인증 시 `/login?redirect={pathname}`으로 리다이렉트

### 의존성
- 1.2 DB 스키마 (User, UserSession 테이블)

### 완료 기준
- [ ] 로그인 → 쿠키 발급 → `/api/auth/me` 성공
- [ ] 로그아웃 → 쿠키 삭제 → `/api/auth/me` 401
- [ ] 미인증 상태에서 보호 라우트 접근 시 로그인 페이지로 리다이렉트
- [ ] 쿠키가 httpOnly로 설정되어 JS에서 접근 불가

---

## 1.4 프로젝트/폴더/세션 CRUD + 사이드바 트리

### 목표
3계층 구조(프로젝트 > 폴더 > 세션) CRUD API + 좌측 사이드바 트리 UI

### 구현 파일
```
backend/src/routes/
├── projects/
│   ├── index.ts                 -- GET/POST /api/projects
│   ├── [id].ts                  -- GET/PATCH/DELETE /api/projects/:id
│   ├── members/
│   │   └── index.ts             -- CRUD /api/projects/:id/members
│   └── folders/
│       ├── index.ts             -- GET/POST /api/projects/:projectId/folders
│       └── [id].ts              -- GET/PATCH/DELETE
├── sessions/
│   ├── index.ts                 -- GET/POST /api/sessions
│   └── [id].ts                  -- GET/PATCH/DELETE /api/sessions/:id
├── tree/
│   └── index.ts                 -- GET /api/tree

backend/src/services/
├── project.service.ts
├── folder.service.ts
├── session.service.ts           -- 세션 생성 시 worktree 생성 로직 포함
└── worktree.service.ts          -- git worktree add/remove 로직

frontend/src/
├── components/
│   └── sidebar/
│       ├── Sidebar.tsx          -- 사이드바 컨테이너
│       ├── ProjectTree.tsx      -- 프로젝트/폴더/세션 트리
│       ├── TreeItem.tsx         -- 개별 트리 노드
│       ├── CreateProjectDialog.tsx
│       ├── CreateFolderDialog.tsx
│       └── CreateSessionDialog.tsx
├── app/(main)/
│   ├── layout.tsx               -- 사이드바 포함 레이아웃
│   └── projects/[projectId]/
│       └── layout.tsx           -- 프로젝트 컨텍스트
```

### 구현 단계

1. **백엔드: 서비스 레이어**
   - `project.service.ts`: Prisma CRUD + 페이지네이션
   - `folder.service.ts`: projectId 기반 CRUD + `(project_id, name)` 중복 체크
   - `session.service.ts`: folderId 기반 CRUD
   - `worktree.service.ts`: `simple-git`으로 `git worktree add/remove` 래핑
     ```typescript
     // 세션 생성 시
     async createWorktree(repoPath: string, sessionId: string): Promise<{ worktreePath: string; branchName: string }> {
       const branchName = `session/${sessionId}`;
       const worktreePath = repoPath.replace('/projects/', '/projects-wt/') + `/${sessionId}`;
       const git = simpleGit(repoPath);
       await git.raw(['worktree', 'add', '-b', branchName, worktreePath]);
       return { worktreePath, branchName };
     }
     ```

2. **백엔드: 라우트**
   - 모든 목록 API에 페이지네이션 적용 (`page`, `limit` 쿼리 파라미터)
   - `POST /api/sessions`: 세션 생성 → worktree 생성 → DB 저장 (worktreePath, branchName 포함)
   - `DELETE /api/sessions/:id`: worktree remove → DB 삭제
   - `GET /api/tree`: 프로젝트 > 폴더 > 세션 전체 트리 한 번에 반환

3. **프론트엔드: TanStack Query 설정**
   - `QueryClientProvider` 설정 (루트 레이아웃)
   - `queryKeys` 정의 (docs/frontend-design.md 참조)
   - `GET /api/tree` 쿼리 훅: 사이드바용

4. **프론트엔드: 사이드바**
   - `Collapsible` 컴포넌트로 트리 접기/펼치기
   - 프로젝트/폴더/세션 각 레벨 아이콘 구분
   - 세션 클릭 → `/projects/[projectId]/folders/[folderId]/sessions/[sessionId]`로 이동
   - 컨텍스트 메뉴(DropdownMenu): 이름 변경, 삭제
   - 새 프로젝트/폴더/세션 생성 다이얼로그 (Dialog)

5. **프론트엔드: (main) 레이아웃**
   - 사이드바 + 콘텐츠 영역 분할
   - `Sheet`로 모바일 사이드바 드로어

### 의존성
- 1.2 DB 스키마
- 1.3 인증 시스템
- EC2에 Git 레포지토리 디렉토리 존재 (`/home/ubuntu/projects/`)

### 완료 기준
- [ ] 프로젝트 CRUD 동작 (API + UI)
- [ ] 폴더 CRUD 동작 (프로젝트 하위)
- [ ] 세션 생성 시 git worktree + 브랜치 자동 생성
- [ ] 세션 삭제 시 worktree 자동 정리
- [ ] 사이드바에서 트리 구조 탐색 가능
- [ ] 세션 클릭 → 채팅 페이지 이동

---

## 1.5 채팅 UI + Claude Code CLI 래핑 (SSE 스트리밍)

### 목표
핵심 기능: 사용자가 자연어 입력 → Claude Code CLI 실행 → SSE로 실시간 응답 표시

### 구현 파일
```
backend/src/
├── services/
│   └── claude.service.ts        -- CLI spawn + stream-json 파싱 + SSE 변환
├── routes/
│   └── sessions/
│       ├── chat.ts              -- POST /api/sessions/:id/chat (SSE)
│       ├── abort.ts             -- POST /api/sessions/:id/abort
│       └── messages.ts          -- GET /api/sessions/:id/messages

frontend/src/
├── app/(main)/projects/[projectId]/folders/[folderId]/sessions/[sessionId]/
│   └── page.tsx                 -- 채팅 페이지 (Server Component)
├── components/
│   ├── session/
│   │   ├── SessionLayout.tsx    -- 채팅 + 터미널 분할 (Phase 4에서 터미널 추가)
│   │   └── SessionHeader.tsx    -- 세션 제목, 상태
│   └── chat/
│       ├── ChatPanel.tsx        -- 채팅 전체 패널
│       ├── MessageList.tsx      -- 메시지 목록 (ScrollArea)
│       ├── MessageItem.tsx      -- 개별 메시지 (memo)
│       ├── StreamingMessage.tsx -- 스트리밍 마크다운 렌더링
│       ├── ToolUseCard.tsx      -- 도구 사용 카드
│       ├── MessageInput.tsx     -- 입력창 + 전송/중지 버튼
│       └── useChat.ts           -- 채팅 상태 관리 훅
├── lib/
│   ├── sse.ts                   -- SSE 파서 (fetch + ReadableStream)
│   └── markdown-sanitizer.ts    -- 불완전 마크다운 처리
├── types/
│   └── stream.ts                -- StreamEvent 타입 정의
```

### 구현 단계

1. **백엔드: Claude CLI 서비스**
   ```typescript
   // services/claude.service.ts
   import { spawn, ChildProcess } from 'child_process';

   class ClaudeService {
     private processes: Map<string, ChildProcess> = new Map();

     async executeChat(sessionId: string, message: string, worktreePath: string, claudeSessionId?: string) {
       const args = ['-p', message, '--output-format', 'stream-json'];
       if (claudeSessionId) {
         args.push('--resume', claudeSessionId);
       }

       const proc = spawn('claude', args, { cwd: worktreePath });
       this.processes.set(sessionId, proc);

       return proc; // stdout을 라인별로 파싱하여 SSE 이벤트로 변환
     }

     abort(sessionId: string) {
       const proc = this.processes.get(sessionId);
       if (proc) {
         proc.kill('SIGTERM');
         this.processes.delete(sessionId);
       }
     }
   }
   ```

2. **백엔드: SSE 라우트**
   - `POST /api/sessions/:id/chat`:
     1. 세션 락 자동 획득/갱신
     2. claudeSessionId 유무에 따라 신규/resume 결정
     3. `child_process.spawn` 실행
     4. stdout 라인별 JSON 파싱 → stream-json 이벤트를 SSE 이벤트로 변환
     5. `Content-Type: text/event-stream` 헤더 설정
     6. 각 이벤트를 `event: {type}\ndata: {json}\n\n` 형식으로 전송
     7. 완료 시 메시지 DB 저장 + claudeSessionId 업데이트
   - stream-json → SSE 매핑:
     - `assistant` type의 `text` content → `assistant_text`
     - `tool_use` 시작 → `tool_use_begin`
     - tool input delta → `tool_use_input`
     - tool 완료 → `tool_use_end`
     - tool result → `tool_result`
     - `system` → `system`
     - `result` → `done`

3. **백엔드: 메시지 저장**
   - 사용자 메시지: 요청 시 즉시 저장 (role: 'user', type: 'text')
   - AI 응답: 스트리밍 완료 후 전체 텍스트 저장 (role: 'assistant', type: 'text')
   - metadata에 toolsUsed, filesChanged 포함

4. **프론트엔드: SSE 파서**
   - `fetch` + `ReadableStream` 기반 (POST 지원)
   - `credentials: 'include'` 포함
   - `event:` / `data:` 라인 파싱
   - `AbortController`로 중단 지원

5. **프론트엔드: 채팅 훅 (useChat)**
   ```typescript
   // 상태: messages[], isStreaming, currentToolUse, error
   // 액션: sendMessage(text), abort()
   // 이벤트 핸들링:
   //   assistant_text → messages의 마지막 assistant 메시지에 content 누적
   //   tool_use_begin → currentToolUse 설정
   //   tool_result → currentToolUse 업데이트
   //   done → isStreaming false, TanStack Query invalidate
   ```

6. **프론트엔드: 채팅 UI**
   - `MessageList`: ScrollArea + 자동 스크롤 (스트리밍 중 하단 고정)
   - `MessageItem`: memo로 완료된 메시지 리렌더 방지
   - `StreamingMessage`: react-markdown + remark-gfm + react-syntax-highlighter
   - 불완전 마크다운 sanitizer 적용 (열린 코드블록/볼드 닫기)
   - `ToolUseCard`: 도구명 + 접기 가능한 입력/출력 영역
   - `MessageInput`: Textarea (자동 높이 조절) + 전송 버튼 + 중지 버튼 (스트리밍 중)

7. **프론트엔드: 메시지 히스토리 로드**
   - `GET /api/sessions/:id/messages`로 이전 대화 로드
   - TanStack Query + 페이지네이션 (무한 스크롤 또는 "이전 메시지 더 보기")

### 의존성
- 1.3 인증 시스템
- 1.4 세션 CRUD (worktreePath 필요)
- EC2에 Claude Code CLI 설치 (`claude` 명령어 사용 가능)

### 완료 기준
- [ ] 채팅 입력 → Claude Code CLI 실행 → SSE 스트리밍 응답 표시
- [ ] 마크다운 + 코드 블록 구문 하이라이팅 정상 렌더링
- [ ] 도구 사용(파일 생성/수정) 카드 표시
- [ ] 중지 버튼으로 AI 응답 중단 가능
- [ ] 세션 이동 후 재진입 시 이전 대화 히스토리 로드
- [ ] claudeSessionId가 첫 채팅 후 DB에 저장되어 이후 `--resume`으로 이어가기

---

## Phase 1 작업 순서 · 의존성 · 병렬 가능 여부

### 의존성 그래프

```
1.1 프로젝트 초기 세팅
 └──→ 1.2 DB 스키마 + Prisma
       └──→ 1.3 인증 시스템
             └──→ 1.4 CRUD + 사이드바
                   └──→ 1.5 채팅 + CLI 래핑
```

### 작업별 병렬 처리 가능 여부

| 작업 | 선행 작업 | 병렬 분리 가능? | 분리 방법 | 충돌 파일 |
|------|-----------|:---:|-----------|-----------|
| 1.1 프로젝트 초기 세팅 | 없음 | **불가** | 프론트+백엔드 동시 초기화해야 함 | `package.json`, `tsconfig.json` |
| 1.2 DB 스키마 | 1.1 | **불가** | Prisma 스키마 단일 파일 작업 | `schema.prisma` |
| 1.3 인증 — 백엔드 | 1.2 | **가능** ✅ | 백엔드 세션 플러그인 + 라우트 | `backend/src/plugins/`, `backend/src/routes/auth/` |
| 1.3 인증 — 프론트 | 1.2 | **가능** ✅ | 로그인 UI + AuthContext + middleware | `frontend/src/` (백엔드와 파일 겹침 없음) |
| 1.4 CRUD — 백엔드 | 1.3 백엔드 | **가능** ✅ | 서비스 레이어 + 라우트 | `backend/src/routes/`, `backend/src/services/` |
| 1.4 CRUD — 프론트 | 1.3 프론트 | **가능** ✅ | 사이드바 + TanStack Query 설정 | `frontend/src/components/sidebar/` |
| 1.5 채팅 — 백엔드 | 1.4 백엔드 | **가능** ✅ | Claude 서비스 + SSE 라우트 | `backend/src/services/claude.service.ts` |
| 1.5 채팅 — 프론트 | 1.4 프론트 | **가능** ✅ | 채팅 UI + SSE 파서 + 마크다운 | `frontend/src/components/chat/`, `frontend/src/lib/sse.ts` |

### 최적 실행 계획 (단일 에이전트)

단일 Claude Code 에이전트가 수행할 때는 서브에이전트 병렬 호출로 **백엔드/프론트엔드를 동시에** 작성할 수 있다. 단, 같은 파일을 수정하지 않아야 한다.

```
Step 1: 1.1 프로젝트 초기 세팅 (순차 — 양쪽 package.json 등 겹침)
Step 2: 1.2 DB 스키마 (순차 — 단일 파일)
Step 3: 1.3 인증 [백엔드 + 프론트엔드 병렬] ← 파일 겹침 없음
Step 4: 1.4 CRUD [백엔드 + 프론트엔드 병렬] ← 파일 겹침 없음
Step 5: 1.5 채팅 [백엔드 + 프론트엔드 병렬] ← 파일 겹침 없음
```

**예상 Step 수: 5 (순차 3 + 병렬 2쌍)**
