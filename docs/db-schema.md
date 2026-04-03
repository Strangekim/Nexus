# Nexus DB 스키마

## 개요

Nexus 플랫폼의 데이터베이스 스키마 정의 문서입니다.
PostgreSQL + Prisma ORM 기반이며, 모든 테이블과 관계, 인덱스, 제약조건을 포함합니다.

---

## 테이블 설명

### users
사용자 정보. `email`을 로그인 식별자(UNIQUE NOT NULL)로 사용하며, `name`은 표시용이다. `auth_mode`에 따라 Claude Code 실행 방식이 달라진다: `subscription` 모드는 `CLAUDE_CONFIG_DIR` 환경변수로 사용자별 OAuth 인증 디렉토리를 분리하여 실행한다. `api` 모드는 현재 미지원이며 차단한다. `claude_account`는 OAuth 연동 상태 마커로 사용되며, 연동 완료 시 `"oauth_connected"` 값이 저장되고 해제 시 `null`로 초기화된다. 알림 설정 컬럼(`phone`, `notify_sms`, `notify_browser`, `notify_sound`)은 `PATCH /api/auth/settings`로 업데이트하며, 작업 완료/허가 요청 시 외부 알림 발송 여부를 제어한다.

### user_sessions
세션 기반 인증을 위한 테이블. `@fastify/session` + `connect-pg-simple`에서 사용하며, `sid`를 기본 키로 세션 데이터(`sess` JSON)와 만료 시각(`expire`)을 저장한다.

### projects
Git 레포지토리와 1:1 매핑되는 프로젝트. `repo_path`는 EC2 내 실제 디렉토리 경로를 가리킨다.

### project_members
프로젝트와 사용자 간 N:M 관계를 매핑하는 조인 테이블. 프로젝트 내 역할(`admin` | `member`)을 관리한다.

### folders
프로젝트 하위의 기능/모듈 단위 폴더. 세션을 논리적으로 그룹화하며, Git 레포지토리 내 실제 디렉토리와 매핑된다. `dir_name` 컬럼에 파일시스템 안전 디렉토리명을 저장하고, 폴더 생성 시 프로젝트 Git 레포에 해당 디렉토리가 자동 생성된다. 폴더 소속 세션의 worktree 작업 디렉토리는 해당 폴더 디렉토리로 스코핑된다.

### sessions
Claude Code 세션과 매핑되는 작업 단위. 세션 락(`locked_by`, `locked_at`)으로 동시 편집을 방지하며, `last_activity_at`으로 무입력 자동 해제를 지원한다. `worktree_path`와 `branch_name`으로 Git worktree를 관리하고, `merge_status`로 main 브랜치 병합 상태를 추적한다. 세션 생성 시 worktree_path와 branch_name이 자동 생성되며, 작업 완료(세션 아카이브) 시 main에 merge 후 merge_status가 업데이트된다.

### messages
세션 내 대화 기록. `role`(user/assistant), `type`(text/tool_use/tool_result/error)으로 메시지를 구분하고, `metadata` JSONB로 tool_use 상세 정보 등을 저장한다.

### commits
Git 커밋 로그. 세션과 프로젝트에 연결되며, `triggered_by`로 커밋을 유발한 Nexus 사용자를 추적한다. `(project_id, hash)` 복합 유니크로 중복을 방지한다. `additions`/`deletions`로 변경 줄 수 통계를 저장한다.

### usage_logs
사용량 로그. 세션별 실행 시간, 비용, 토큰 사용량(`input_tokens`, `output_tokens`)을 기록한다.

### notifications
오프라인 알림. 세션 락 요청, 작업 완료 등의 알림을 사용자별로 저장하고 읽음 상태를 관리한다. `type`은 snake_case로 통일한다: `lock_request`, `lock_released`, `task_complete`, `mention`.

---

## Prisma 스키마

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// 사용자
// ─────────────────────────────────────────────
model User {
  id             String   @id @default(uuid()) @db.Uuid
  name           String   @db.VarChar(100)
  email          String   @unique @db.VarChar(255)
  passwordHash   String   @map("password_hash") @db.Text
  role           String   @default("member") @db.VarChar(20) // 'admin' | 'member'
  linuxUser      String?  @unique @map("linux_user") @db.VarChar(50)
  authMode       String   @default("subscription") @map("auth_mode") @db.VarChar(20) // 'subscription' | 'api'
  claudeAccount  String?  @map("claude_account") @db.Text  // OAuth 연동 상태 마커 ("oauth_connected" 또는 null) — 실제 토큰은 CLAUDE_CONFIG_DIR에 파일로 저장
  createdAt      DateTime @default(now()) @map("created_at")

  // 알림 설정 — PATCH /api/auth/settings 로 업데이트
  phone          String?  @db.VarChar(20)          // SMS 수신 전화번호 (예: '01012345678', null이면 SMS 미발송)
  notifySms      Boolean  @default(false) @map("notify_sms")      // SMS 알림 활성화 여부
  notifyBrowser  Boolean  @default(true)  @map("notify_browser")  // 브라우저 푸시 알림 활성화 여부
  notifySound    Boolean  @default(true)  @map("notify_sound")    // 알림음 활성화 여부

  // Relations
  sessions         Session[]       @relation("CreatedSessions")
  lockedSessions   Session[]       @relation("LockedSessions")
  messages         Message[]
  usageLogs        UsageLog[]
  projectMembers   ProjectMember[]
  notifications    Notification[]
  triggeredCommits Commit[]        @relation("TriggeredCommits")

  @@map("users")
}

// ─────────────────────────────────────────────
// 세션 기반 인증 (@fastify/session + connect-pg-simple)
// ─────────────────────────────────────────────
model UserSession {
  sid    String   @id @db.VarChar(255)
  sess   Json
  expire DateTime @db.Timestamp(6)

  @@index([expire])
  @@map("user_sessions")
}

// ─────────────────────────────────────────────
// 프로젝트 (Git 레포 1:1)
// ─────────────────────────────────────────────
model Project {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(200)
  repoPath    String   @unique @map("repo_path") @db.VarChar(500)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  folders        Folder[]
  sessions       Session[]       // 프로젝트 직속 세션 (폴더 미소속)
  commits        Commit[]
  projectMembers ProjectMember[]

  @@map("projects")
}

// ─────────────────────────────────────────────
// 프로젝트 멤버 (프로젝트-사용자 N:M)
// ─────────────────────────────────────────────
model ProjectMember {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      String   @default("member") @db.VarChar(20) // 'admin' | 'member'
  joinedAt  DateTime @default(now()) @map("joined_at")

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_members")
}

// ─────────────────────────────────────────────
// 폴더 (기능/모듈 단위)
// ─────────────────────────────────────────────
model Folder {
  id          String   @id @default(uuid()) @db.Uuid
  projectId   String   @map("project_id") @db.Uuid
  name        String   @db.VarChar(200)
  dirName     String   @map("dir_name") @db.VarChar(200) // Git 레포 내 실제 디렉토리명 (파일시스템 안전 문자열, 생성 시 자동 결정)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  // Relations
  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sessions Session[]

  @@unique([projectId, name])
  @@unique([projectId, dirName])
  @@index([projectId])
  @@map("folders")
}

// ─────────────────────────────────────────────
// 세션 (Claude Code 세션과 매핑)
// ─────────────────────────────────────────────
model Session {
  id               String    @id @default(uuid()) @db.Uuid
  projectId        String    @map("project_id") @db.Uuid          // 소속 프로젝트 (필수)
  folderId         String?   @map("folder_id") @db.Uuid           // 소속 폴더 (null이면 프로젝트 직속 세션)
  claudeSessionId  String?   @map("claude_session_id") @db.VarChar(100)
  title            String    @db.VarChar(300)
  lockedBy         String?   @map("locked_by") @db.Uuid
  lockedAt         DateTime? @map("locked_at")
  lastActivityAt   DateTime? @map("last_activity_at")
  createdBy        String?   @map("created_by") @db.Uuid
  status           String    @default("active") @db.VarChar(20) // 'active' | 'archived'
  worktreePath     String?   @map("worktree_path") @db.VarChar(500) // worktree 디렉토리 경로 (예: /home/ubuntu/projects-wt/shopping-mall/session-abc/)
  branchName       String?   @map("branch_name") @db.VarChar(200) // 브랜치명 (예: session/abc)
  mergeStatus      String    @default("working") @map("merge_status") @db.VarChar(20) // 'working' | 'merged' | 'conflict'
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  folder    Folder?    @relation(fields: [folderId], references: [id], onDelete: Cascade)
  creator   User?      @relation("CreatedSessions", fields: [createdBy], references: [id], onDelete: SetNull)
  locker    User?      @relation("LockedSessions", fields: [lockedBy], references: [id], onDelete: SetNull)
  messages  Message[]
  commits   Commit[]
  usageLogs UsageLog[]

  @@index([projectId])
  @@index([folderId])
  @@index([folderId, status])
  @@index([lockedBy])
  @@index([claudeSessionId])
  @@map("sessions")
}

// ─────────────────────────────────────────────
// 메시지 (대화 기록)
// ─────────────────────────────────────────────
model Message {
  id         String   @id @default(uuid()) @db.Uuid
  sessionId  String   @map("session_id") @db.Uuid
  userId     String?  @map("user_id") @db.Uuid
  role       String   @db.VarChar(20) // 'user' | 'assistant'
  type       String   @default("text") @db.VarChar(30) // 'text' | 'tool_use' | 'tool_result' | 'error'
  content    String   @db.Text
  metadata   Json?    @db.JsonB // tool_use 상세 정보 등
  tokenCount Int?     @map("token_count")
  createdAt  DateTime @default(now()) @map("created_at")

  // Relations
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([sessionId, createdAt])
  @@map("messages")
}

// ─────────────────────────────────────────────
// 커밋 로그
// ─────────────────────────────────────────────
model Commit {
  id           String   @id @default(uuid()) @db.Uuid
  sessionId    String?  @map("session_id") @db.Uuid
  projectId    String   @map("project_id") @db.Uuid
  hash         String   @db.VarChar(40)
  message      String?  @db.Text
  author       String?  @db.VarChar(100)
  triggeredBy  String?  @map("triggered_by") @db.Uuid
  filesChanged Json?    @map("files_changed") @db.JsonB // ["src/auth.ts", ...]
  additions    Int?     @map("additions")               // 추가 줄 수
  deletions    Int?     @map("deletions")               // 삭제 줄 수
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  session   Session? @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  triggerer User?    @relation("TriggeredCommits", fields: [triggeredBy], references: [id], onDelete: SetNull)

  @@unique([projectId, hash])
  @@index([projectId, createdAt])
  @@index([projectId, author])
  @@index([sessionId])
  @@map("commits")
}

// ─────────────────────────────────────────────
// 사용량 로그
// ─────────────────────────────────────────────
model UsageLog {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String?  @map("user_id") @db.Uuid
  sessionId    String?  @map("session_id") @db.Uuid
  durationMs   Int?     @map("duration_ms")
  inputTokens  Int?     @map("input_tokens")
  outputTokens Int?     @map("output_tokens")
  costUsd      Decimal? @map("cost_usd") @db.Decimal(10, 6)
  createdAt    DateTime @default(now()) @map("created_at")

  // Relations
  user    User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  session Session? @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("usage_logs")
}

// ─────────────────────────────────────────────
// 알림
// ─────────────────────────────────────────────
model Notification {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      String   @db.VarChar(50) // 'lock_request' | 'lock_released' | 'task_complete' | 'mention'
  payload   Json?    @db.JsonB
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}
```

---

## ER 관계 다이어그램

```
users
  |
  |── 1:N ── project_members ── N:1 ── projects
  |                                        |
  |                                        |── 1:N ── folders
  |                                        |             |
  |                                        |             |── 1:N ── sessions (folderId)
  |                                        |
  |                                        |── 1:N ── sessions (projectId, 폴더 미소속)
  |                                        |             |
  |                                        |             |── 1:N ── messages
  |                                        |             |── 1:N ── commits
  |                                        |             |── 1:N ── usage_logs
  |── 1:N (created_by) ── sessions         |
  |    [onDelete: SetNull]                 |── 1:N ── commits
  |── 1:N (locked_by)  ── sessions         |
  |    [onDelete: SetNull]
  |── 1:N ── messages
  |    [onDelete: SetNull]
  |── 1:N ── usage_logs
  |    [onDelete: Cascade]
  |── 1:N (triggered_by) ── commits
  |    [onDelete: SetNull]
  |── 1:N ── notifications
  |    [onDelete: Cascade]
  |
  |── 1:N ── project_members
       [onDelete: Cascade]

user_sessions (독립 테이블 — @fastify/session + connect-pg-simple 전용)
  sid (PK), sess (JSON), expire (Timestamp)

sessions 테이블 주요 컬럼:
  project_id      UUID          -- 소속 프로젝트 (필수)
  folder_id       UUID?         -- 소속 폴더 (null이면 프로젝트 직속)
  worktree_path   VARCHAR(500)  -- Git worktree 디렉토리 경로
  branch_name     VARCHAR(200)  -- Git 브랜치명 (예: session/abc)
  merge_status    VARCHAR(20)   -- 'working' | 'merged' | 'conflict'

commits 테이블 주요 컬럼:
  additions       INT?          -- 추가 줄 수
  deletions       INT?          -- 삭제 줄 수
```

### 관계 상세

| 관계 | 설명 | onDelete 정책 |
|------|------|---------------|
| `users` 1:N `project_members` | 사용자는 여러 프로젝트에 참여 가능 | Cascade |
| `projects` 1:N `project_members` | 프로젝트는 여러 멤버를 가짐 | Cascade |
| `projects` 1:N `folders` | 프로젝트는 여러 폴더를 포함 | Cascade |
| `projects` 1:N `sessions` | 프로젝트 직속 세션 (folderId=null) | Cascade |
| `projects` 1:N `commits` | 프로젝트는 여러 커밋을 가짐 | Cascade |
| `folders` 1:N `sessions` | 폴더는 여러 세션을 포함 | Cascade |
| `sessions` 1:N `messages` | 세션은 여러 메시지를 포함 | Cascade |
| `sessions` 1:N `commits` | 세션에서 여러 커밋이 발생 가능 | Cascade |
| `sessions` 1:N `usage_logs` | 세션별 여러 사용량 기록 | Cascade |
| `users` 1:N `sessions` (created_by) | 사용자가 세션을 생성 | **SetNull** (nullable) |
| `users` 1:N `sessions` (locked_by) | 사용자가 세션을 잠금 | **SetNull** (nullable) |
| `users` 1:N `messages` (user_id) | 사용자가 메시지를 작성 | **SetNull** (nullable) |
| `users` 1:N `commits` (triggered_by) | 사용자가 커밋을 유발 | **SetNull** (nullable) |
| `users` 1:N `usage_logs` | 사용자별 사용량 기록 | **Cascade** (사용자 삭제 시 로그도 삭제) |
| `users` 1:N `notifications` | 사용자별 알림 | Cascade |

---

## users 알림 설정 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `phone` | `VARCHAR(20)?` | null | SMS 수신 전화번호 (null이면 SMS 미발송) |
| `notify_sms` | `BOOLEAN` | false | SMS 알림 활성화 여부 (phone이 있어야 실제 발송됨) |
| `notify_browser` | `BOOLEAN` | true | 브라우저 푸시 알림 활성화 여부 |
| `notify_sound` | `BOOLEAN` | true | 알림음 활성화 여부 |

> **SMS 발송 조건:** `notify_sms=true` AND `phone IS NOT NULL` AND 알리고 환경변수 설정됨.
> `PATCH /api/auth/settings`로 업데이트하며, `session:task-complete` / `session:permission-required` 이벤트 발생 시 참조된다.

---

## users Claude OAuth 연동 컬럼

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `claude_account` | `TEXT?` | null | OAuth 연동 상태 마커. 연동 완료 시 `"oauth_connected"`, 미연동 시 `null` |

> **토큰 저장 위치:** access_token, refresh_token 등 실제 자격증명은 DB가 아닌 서버 파일시스템의 `CLAUDE_CONFIG_DIR/{userId}/credentials.json`에 저장한다. 파일 권한은 `600`으로 설정한다.
> **연동 흐름:** `POST /api/auth/claude/start` → OAuth PKCE 인증 → `POST /api/auth/claude/callback` → 토큰 저장 + `claude_account = "oauth_connected"` DB 업데이트
> **연동 해제:** `POST /api/auth/claude/disconnect` → `credentials.json` 삭제 + `claude_account = null`로 초기화

## claude-configs 디렉토리 구조

```
{CLAUDE_CONFIGS_DIR}/              ← 환경변수 CLAUDE_CONFIGS_DIR (예: /home/ubuntu/claude-configs)
├── {userId-1}/                    ← 사용자별 CLAUDE_CONFIG_DIR (디렉토리 권한: 700)
│   ├── credentials.json           ← OAuth 자격증명 (파일 권한: 600)
│   ├── projects/                  ← Claude Code JSONL 세션 파일
│   │   └── {hash}/
│   │       └── *.jsonl
│   └── settings.json              ← 사용자별 Claude Code 설정
├── {userId-2}/
│   ├── credentials.json
│   └── ...
└── ...
```

> **초기 디렉토리 생성:** 사용자 OAuth 연동 완료 시 `mkdir -p {CLAUDE_CONFIGS_DIR}/{userId}` 후 `chmod 700` 적용.
> **CLI 실행 시 주입:** `spawn('claude', args, { env: { CLAUDE_CONFIG_DIR: '{CLAUDE_CONFIGS_DIR}/{userId}' } })`

---

## UNIQUE 제약조건

| 테이블 | 컬럼 | 설명 |
|--------|------|------|
| `users` | `email` | 로그인 식별자 중복 방지 (UNIQUE NOT NULL) |
| `users` | `linux_user` | EC2 리눅스 유저명 중복 방지 |
| `projects` | `repo_path` | 동일 레포 경로 중복 등록 방지 |
| `commits` | `(project_id, hash)` | 같은 프로젝트 내 커밋 해시 중복 방지 |
| `folders` | `(project_id, name)` | 같은 프로젝트 내 폴더명 중복 방지 |
| `folders` | `(project_id, dir_name)` | 같은 프로젝트 내 디렉토리명 중복 방지 |
| `project_members` | `(project_id, user_id)` | 동일 프로젝트-사용자 매핑 중복 방지 |

---

## 인덱스

| 테이블 | 인덱스 컬럼 | 용도 |
|--------|-------------|------|
| `sessions` | `project_id` | 프로젝트별 세션 조회 |
| `sessions` | `folder_id` | 폴더별 세션 조회 |
| `sessions` | `(folder_id, status)` | 폴더별 활성 세션 필터링 |
| `sessions` | `locked_by` | 사용자별 락 세션 조회 |
| `sessions` | `claude_session_id` | Claude Code 세션 ID 기반 조회 |
| `messages` | `(session_id, created_at)` | 세션별 메시지 시간순 조회 |
| `commits` | `(project_id, created_at)` | 프로젝트별 커밋 타임라인 |
| `commits` | `(project_id, author)` | 작성자별 커밋 필터 |
| `commits` | `session_id` | 세션별 커밋 조회 |
| `usage_logs` | `(user_id, created_at)` | 사용자별 사용량 기간 조회 |
| `folders` | `project_id` | 프로젝트별 폴더 조회 |
| `notifications` | `(user_id, is_read)` | 사용자별 미읽은 알림 조회 |
| `user_sessions` | `expire` | 만료된 세션 정리용 조회 |

---

## 삭제 정책 (onDelete)

### CASCADE 삭제

| 부모 삭제 시 | 자동 삭제 대상 | 설명 |
|-------------|---------------|------|
| `projects` 삭제 | `folders`, `sessions`, `commits`, `project_members` | 프로젝트 삭제 시 하위 데이터 모두 정리 |
| `folders` 삭제 | `sessions` (folderId=해당 폴더인 것) | 폴더 삭제 시 소속 세션 정리 |
| `sessions` 삭제 | `messages`, `commits`, `usage_logs` | 세션 삭제 시 대화/커밋/사용량 정리 |
| `users` 삭제 | `project_members`, `notifications`, `usage_logs` | 사용자 삭제 시 멤버십/알림/사용량 로그 정리 |

### SetNull 정책

| 부모 삭제 시 | 대상 컬럼 | 설명 |
|-------------|-----------|------|
| `users` 삭제 | `sessions.created_by` | 생성자 정보만 NULL 처리, 세션은 유지 |
| `users` 삭제 | `sessions.locked_by` | 잠금 정보만 NULL 처리, 세션은 유지 |
| `users` 삭제 | `messages.user_id` | 작성자 정보만 NULL 처리, 메시지는 유지 |
| `users` 삭제 | `commits.triggered_by` | 유발자 정보만 NULL 처리, 커밋 기록은 유지 |

> 참고: `projects` -> `folders` -> `sessions(folderId)` + `projects` -> `sessions(projectId)` 모두 CASCADE로 전파되므로, 프로젝트 삭제 시 폴더, 세션(폴더 소속 + 직속 모두), 메시지, 커밋이 모두 삭제된다. 사용자 삭제 시에는 세션/메시지/커밋 자체는 보존되고 FK 참조만 NULL로 설정된다.

---

## Notification type 값 (snake_case 통일)

DB 저장값과 WebSocket 이벤트 payload 모두 동일한 snake_case 값을 사용한다.

| type 값 | 설명 |
|---------|------|
| `lock_request` | 세션 잠금 요청 알림 |
| `lock_released` | 세션 잠금 해제 알림 |
| `task_complete` | 작업 완료 알림 |
| `mention` | 멘션 알림 |
