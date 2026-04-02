# Nexus — 팀 AI 협업 코딩 플랫폼 기획서 v1.4

---

## 1. 프로젝트 개요

### 한 줄 정의
**Nexus**는 팀 전용 웹 기반 자연어 코딩 + 프로젝트 관리 플랫폼이다. 모든 팀원이 자연어로 AI에게 코딩을 지시하고, PM처럼 프로젝트 진행 상황을 질의하며, 공유 코드베이스 위에서 충돌 없이 협업하는 환경을 제공한다.

### 핵심 전제
- **모든 팀원은 자연어로 코딩한다.** 직접 코드를 작성하지 않고, AI에게 지시하여 코드를 생성/수정한다.
- **AI는 코딩 도구이자 PM 도구다.** 세션 히스토리 기반으로 "지금까지 뭘 했는지", "어디까지 진행됐는지" 등 프로젝트 현황을 자연어로 질의할 수 있다.
- AI가 코드를 수정하므로 **Nexus가 오케스트레이션 레이어로 개입**하여 충돌 방지, 자동 커밋, 롤백 등을 제어할 수 있다.
- **Claude Code CLI를 내부적으로 래핑**하여 파일 조작, 명령 실행, 컨텍스트 압축 등 기존 기능을 그대로 활용한다.

### 해결하는 문제
| 문제 | 기존 상황 | Nexus 해결 |
|------|-----------|------------|
| 컨텍스트 파편화 | 각자 로컬에서 Claude 사용, 맥락 공유 불가 | 세션 중앙 저장, 누구나 열람/이어받기 |
| 프로젝트 현황 불투명 | 진행 상황 파악에 별도 미팅/문서 필요 | AI에게 자연어로 질의 → 히스토리 기반 답변 |
| Git 충돌 | 동시 작업 후 conflict 수동 해결 | git worktree로 세션별 작업 디렉토리 격리 + 자동 커밋으로 충돌 사전 방지 |
| 작업 히스토리 불투명 | 누가 뭘 시켰는지 파악 불가 | 팀 대시보드에서 전체 작업 흐름 가시화 |
| 롤백 어려움 | AI가 코드 망치면 복구 곤란 | Git 자동 커밋 기반 원클릭 롤백 |
| 온보딩 비용 | 신규 팀원에게 반복 설명 | 세션 히스토리 열람으로 맥락 자체 파악 |

---

## 2. 주요 기능

### 2.1 웹 기반 자연어 코딩

#### 사용자 경험 (UX)
- **Claude 웹과 동일한 채팅 인터페이스**
  - 하단 입력창에 자연어로 지시 입력
  - AI 응답이 실시간 스트리밍으로 표시
  - 마크다운 렌더링, 코드 블록 구문 하이라이팅
  - 대화 흐름이 시간순으로 누적 표시
- 좌측 사이드바에서 프로젝트 > 폴더 > 세션 탐색
- 세션 내에서 이전 대화 내역 스크롤로 확인 가능
- 현재 세션의 락 상태, 작업자 정보 상단 표시

#### 내부 구현 (Backend)
- 사용자 입력을 받아 EC2에서 Claude Code CLI를 비대화식(`-p`)으로 실행
- `--output-format stream-json`으로 출력을 캡처하여 SSE로 프론트에 전달
- `--resume {session-id}`로 Claude Code 세션 이어가기
- `cwd`를 프로젝트 디렉토리로 설정 → Claude Code가 해당 프로젝트의 CLAUDE.md, skills, 코드를 자동 인식
- 팀원 각자의 Claude 구독(Pro/Max/Team)으로 OAuth 인증 및 과금 (CLAUDE_CONFIG_DIR 기반 사용자별 인증 분리)

### 2.2 프로젝트 관리 (PM 기능)

#### 사용자 경험 (UX)
- 채팅 인터페이스에서 자연어로 프로젝트 현황 질의
  - "지금까지 인증 모듈에서 뭘 했어?"
  - "이번 주 변경된 파일 목록 알려줘"
  - "결제 기능 어디까지 진행됐어?"
- AI가 대화 히스토리 + Git 로그를 종합하여 답변

#### 내부 구현 (Backend)
- 프로젝트/폴더 단위 세션 요약 + Git 로그를 수집
- Claude Code를 읽기 전용 모드(`--allowedTools "Read,Glob,Grep"`)로 실행
- 수집한 컨텍스트를 프롬프트에 포함하여 현황 답변 생성

### 2.3 대화 세션 관리 (3계층 구조)

#### 사용자 경험 (UX)
```
프로젝트 (Project) ─── Git 레포지토리 1:1 매핑
├── 세션 (직속) ─── 프로젝트 전반 논의/질문용
├── 폴더 (Folder) ─── 기능/모듈 단위
│   ├── 세션 (Session) ─── 개별 코딩 작업 단위
│   ├── 세션
│   └── 세션
├── 폴더
│   ├── 세션
│   └── 세션
└── 폴더
    └── 세션
```

- 좌측 사이드바에서 트리 구조로 탐색
- **프로젝트**: 최상위 단위 (예: `쇼핑몰`, `AI 오디오 플랫폼`)
- **폴더**: 기능/모듈 단위 (예: `인증`, `결제`, `프론트엔드`)
- **세션 (폴더 하위)**: 개별 코딩 작업 대화 (예: `로그인 API 구현`, `리프레시 토큰 로직`)
- **세션 (프로젝트 직속)**: 프로젝트 전반에 대한 논의/질문 대화 (폴더 미소속, worktree 없음)
- 세션 클릭 시 대화 내역 로드, 이어서 작업 가능
- 다른 팀원의 세션도 열람 가능 (잠금 해제 시 이어받기 가능)

#### 세션 락
- 편집 중인 세션은 잠금 → 다른 팀원은 읽기 전용
- 무입력 10~15분 자동 해제
- 락 가져오기 요청 → 현재 사용자에게 실시간 알림

#### 컨텍스트 압축
- Claude Code 내장 auto-compaction 그대로 활용 (자체 구현 불필요)
- Skills/CLAUDE.md에 "Compact Instructions" 섹션으로 보존할 정보 정의 가능

#### 내부 구현 (Backend)
- 세션별 대화 히스토리를 중앙 DB에 저장 + Claude Code JSONL과 session_id로 매핑
- 세션 이어받기 시 `claude --resume {session-id}` 실행
- 세션 락 상태는 WebSocket으로 실시간 동기화

### 2.4 Git 자동 관리 (레포지토리 단위)

#### 사용자 경험 (UX)
- 대시보드에서 커밋 타임라인을 세션별 색 구분으로 확인
- 각 커밋 클릭 → Diff 뷰어에서 변경사항 확인
- 원클릭 롤백 버튼으로 특정 커밋 되돌리기
- 커밋은 AI 작업 시 자동 생성 (팀원이 직접 할 필요 없음)

#### 내부 구현 (Backend)
- Skills에 커밋 규칙 정의 → Claude Code가 매 작업 후 자동 커밋
- 커밋 메시지 형식: `[세션명] 작업 요약 - 작업자`
- `simple-git`으로 로그 조회, Diff 생성, Revert 실행

### 2.5 팀 대시보드

#### 사용자 경험 (UX)
- **작업 현황**: 누가 어떤 세션에서 작업 중인지 실시간 카드/뱃지
- **Git 로그 타임라인**: 전체 커밋 히스토리를 세션/팀원별로 시각화
- **파일 변경 맵**: 오늘/이번 주 변경된 파일 목록 및 변경 빈도
- **사용량 모니터링**: 팀원별 사용 현황
- **프로젝트 진행률**: 폴더별 세션 수/커밋 수 기반 활동 요약

### 2.6 회원 계층 관리
- 관리자 / 멤버 역할 구분
- 관리자: DB 직접 접속으로 회원 추가/삭제/역할 변경
- 별도 회원가입 UI 불필요
- 팀원별 Claude 구독 계정으로 인증

### 2.7 Skills / CLAUDE.md 웹 편집

#### 사용자 경험 (UX)
- 웹 에디터(Monaco Editor)에서 직접 편집
- 프로젝트 컨벤션, 코딩 규칙, 자동 커밋 규칙, Compact Instructions 등 관리
- 저장 시 다음 세션부터 자동 반영

### 2.8 터미널 / 로그 뷰어

#### 사용자 경험 (UX)
- 채팅 화면 하단 또는 분할 패널로 터미널 출력 표시
- AI가 실행한 명령어 및 결과 실시간 확인
- 빌드/테스트 성공·실패 시각적 표시
- 에러 로그 하이라이팅

#### 내부 구현 (Backend)
- Claude Code `--output-format stream-json` 출력에서 tool_use 이벤트 파싱
- xterm.js로 터미널 스타일 렌더링

### 2.9 반응형 UI
- **PC**: 풀 기능 (코딩, 대시보드, Git 관리, 세션 관리, Skills 편집)
- **모바일**: 모니터링 중심 (대시보드, 세션 열람, 알림 확인, 간단한 지시)

---

## 3. 시스템 아키텍처

### 3.1 EC2 디렉토리 구조

```
EC2 Instance (호스트에서 직접 실행)
│
├── /home/ubuntu/nexus/             ← Nexus 플랫폼 코드
│   ├── frontend/                   ← Next.js (pm2 또는 직접 실행)
│   │   ├── src/
│   │   └── package.json
│   ├── backend/                    ← Fastify (pm2 또는 직접 실행)
│   │   ├── src/
│   │   └── package.json
│   └── nginx/
│       └── nginx.conf
│
├── /home/ubuntu/projects/          ← 팀 프로젝트 코드 (Claude Code 작업 대상)
│   ├── shopping-mall/              ← main (원본)
│   │   ├── .git/
│   │   ├── CLAUDE.md
│   │   ├── .claude/
│   │   │   └── skills.md
│   │   ├── src/
│   │   └── ...
│   ├── audio-platform/
│   │   ├── .git/
│   │   ├── CLAUDE.md
│   │   ├── .claude/
│   │   │   └── skills.md
│   │   ├── src/
│   │   └── ...
│   └── ...
│
├── /home/ubuntu/projects-wt/       ← git worktree 작업 디렉토리
│   ├── shopping-mall/
│   │   ├── session-abc/            ← branch: session/abc
│   │   └── session-def/            ← branch: session/def
│   └── audio-platform/
│       └── session-ghi/            ← branch: session/ghi
│
├── /home/ubuntu/claude-configs/    ← 팀원별 Claude OAuth 인증 디렉토리 (CLAUDE_CONFIGS_DIR)
│   ├── {userId-1}/                 ← 사용자 A의 CLAUDE_CONFIG_DIR (권한: 700)
│   │   ├── credentials.json        ← OAuth 토큰 (권한: 600)
│   │   └── projects/               ← Claude Code JSONL 세션 파일
│   └── {userId-2}/                 ← 사용자 B의 CLAUDE_CONFIG_DIR (권한: 700)
│       ├── credentials.json
│       └── projects/
│
└── PostgreSQL                      ← 호스트 직접 설치
```

### 3.2 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────┐
│                    사용자 레이어                      │
│                                                      │
│   Browser (PC / Mobile 반응형)                       │
│   └── Next.js (App Router)                           │
│       ├── 채팅 UI (Claude 웹 스타일)                 │
│       ├── 대시보드 (작업 현황 / Git 시각화)          │
│       ├── PM 뷰 (프로젝트 현황 질의)                 │
│       ├── 터미널 뷰어 (xterm.js)                     │
│       ├── Diff 뷰어 (Monaco Editor)                  │
│       └── Skills 에디터 (Monaco Editor)              │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / WebSocket / SSE
                       │
┌──────────────────────▼──────────────────────────────┐
│              Nginx (리버스 프록시 + HTTPS)            │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│        Nexus Backend (EC2 호스트 직접 실행)            │
│                                                      │
│   Node.js (Fastify)                                  │
│   ├── Auth Middleware (세션 기반 인증, cookie)         │
│   ├── Claude Code Controller                         │
│   │   ├── child_process로 호스트의 claude CLI 실행   │
│   │   ├── stream-json 파싱 → SSE 스트리밍            │
│   │   ├── --resume으로 세션 이어가기                 │
│   │   └── cwd를 worktree 디렉토리로 설정             │
│   ├── PM Controller                                  │
│   │   ├── 세션 히스토리 + Git 로그 수집              │
│   │   └── 읽기 전용 Claude Code로 현황 질의          │
│   ├── Session Manager                                │
│   │   ├── 프로젝트 > 폴더 > 세션 CRUD               │
│   │   ├── 세션 생성 시 git worktree + branch 생성    │
│   │   ├── 세션 락/해제                               │
│   │   ├── 작업 완료 시 main merge + worktree 정리    │
│   │   └── Claude Code JSONL ↔ DB 동기화              │
│   ├── Git Controller                                 │
│   │   ├── 로그 조회 / Diff 생성 (simple-git)         │
│   │   └── Revert 실행                                │
│   ├── WebSocket Server (Socket.IO)                   │
│   │   ├── 세션 락 실시간 동기화                      │
│   │   ├── 작업 현황 브로드캐스트                     │
│   │   └── 알림                                       │
│   └── Skills Controller                              │
│       └── CLAUDE.md / skills.md 웹 편집 + 저장       │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│  PostgreSQL  │ │  Claude   │ │ /home/ubuntu/    │
│  (호스트     │ │  Code CLI │ │ projects/        │
│   직접설치)  │ │ (EC2 호스트│ │                  │
│  - users     │ │  에 설치)  │ │ - shopping-mall/ │
│  - projects  │ │           │ │ - audio-platform/│
│  - folders   │ │ 팀원 구독  │ │ - ...            │
│  - sessions  │ │ OAuth      │ │                  │
│  - messages  │ │ PKCE 인증  │ │ 각 프로젝트:     │
│  - commits   │ │ (사용자별  │ │  .git/           │
│  - usage_logs│ │ config_dir)│ │  CLAUDE.md       │
└──────────────┘ └──────────┘ │  .claude/skills  │
                              └──────────────────┘
```

### 3.3 핵심 설계 결정

| 결정 | 이유 |
|------|------|
| **전체 호스트 직접 실행** | 모든 서비스를 EC2 호스트에서 직접 실행. 백엔드가 `child_process.spawn`으로 같은 호스트의 Claude Code CLI를 직접 실행. PostgreSQL도 호스트에 직접 설치 |
| **세션 기반 인증 (cookie)** | 단일 EC2 서버에서 WebSocket/SSE 쿠키 자동 전송이 유리. `@fastify/session` + PostgreSQL session store 사용. 로그아웃 시 세션 삭제로 즉시 무효화 가능 |
| **git worktree로 세션별 작업 공간 격리** | 세션 생성 시 `git worktree add`로 독립 작업 디렉토리 + 브랜치 생성. 파일 충돌 없음, git index.lock 없음, 진정한 동시 작업 가능 |
| **worktree 디렉토리 = Claude Code cwd** | `claude -p` 실행 시 `cwd`를 `/home/ubuntu/projects-wt/{프로젝트명}/{세션명}/`으로 설정 → CLAUDE.md, skills, 코드 자동 인식 |
| **Git 커밋은 Claude Code가 수행** | Skills에 "매 작업 후 자동 커밋" 규칙 정의 → Claude Code가 커밋. Nexus는 `simple-git`으로 로그 조회/revert만 담당 |
| **세션 이중 저장** | Claude Code JSONL(세션 이어가기용) + Nexus DB(히스토리 열람/검색용)를 session_id로 매핑 |
| **세션 락 + worktree 병행** | 세션 락으로 동일 세션 동시 수정 방지 + git worktree로 세션 간 작업 공간 격리 |
| **UX와 구현 분리** | 사용자는 Claude 웹과 동일한 채팅 UI만 보고, CLI 래핑은 백엔드 내부에서 처리 |

---

## 4. 기술 스택

### Frontend
| 기술 | 선정 이유 |
|------|-----------|
| **Next.js 14+ (App Router)** | SSR/CSR 혼합, API Routes, SSAFY 익숙도 |
| **TypeScript** | 타입 안전성, 팀 협업 시 필수 |
| **Tailwind CSS** | 반응형 빠른 구현 |
| **Socket.IO Client** | 실시간 락 상태, 알림 수신 |
| **Monaco Editor** | Diff 뷰어, Skills 편집 (VS Code 엔진) |
| **xterm.js** | 터미널 로그 뷰어 |
| **react-flow 또는 D3.js** | Git 커밋 그래프 시각화 |

### Backend
| 기술 | 선정 이유 |
|------|-----------|
| **Node.js + Fastify** | 경량, 고성능, WebSocket 지원 |
| **TypeScript** | 프론트와 타입 공유 |
| **Socket.IO** | 실시간 양방향 통신 |
| **simple-git** | Git 로그 조회, Diff, Revert |
| **child_process (spawn)** | 호스트의 Claude Code CLI 실행 + 출력 스트리밍 |

### Database
| 기술 | 선정 이유 |
|------|-----------|
| **PostgreSQL** | 관계형 데이터, JSON 지원, 안정성 |
| **Prisma** | ORM, 마이그레이션, TypeScript 타입 자동 생성 |

### Infrastructure
| 기술 | 선정 이유 |
|------|-----------|
| **AWS EC2** | 공유 코드베이스 + Claude Code 실행 환경 |
| **pm2** | Nexus 프론트+백엔드 프로세스 관리 |
| **Nginx** | 리버스 프록시, WebSocket 업그레이드, HTTPS |
| **Claude Code CLI** | EC2 호스트에 설치, 팀원별 Claude OAuth(PKCE) + CLAUDE_CONFIG_DIR로 인증 분리 |
| **GitHub** | 원격 레포 백업 |

---

## 5. 핵심 플로우

### 5.1 자연어 코딩 플로우
```
[사용자 화면]
팀원이 채팅 입력창에 "로그인 API를 Express로 구현해줘" 입력
  → AI 응답이 실시간 스트리밍으로 표시 (코드 블록 포함)
  → 작업 완료 시 "커밋 완료" 알림 표시

[백엔드 내부]
  → 세션 락 확인 → 락 획득
  → (최초 세션 생성 시) git worktree add로 독립 작업 디렉토리 + 브랜치 생성
  → child_process.spawn('claude', ['-p', '입력', '--resume', id,
      '--output-format', 'stream-json', '--allowedTools', '...'],
      { cwd: '/home/ubuntu/projects-wt/프로젝트명/세션명/' })
  → cwd를 worktree 경로로 설정하여 CLI 실행
  → stream-json → SSE로 프론트 전달
  → Claude Code가 파일 수정 + 자동 git commit (세션 브랜치에)
  → 결과를 DB에 저장
  → 작업 완료 시 → main에 merge (충돌 시 AI 자동 해결) + worktree 정리
```

### 5.2 PM 질의 플로우
```
[사용자 화면]
팀원이 "인증 모듈 어디까지 진행됐어?" 입력
  → AI가 현황을 정리하여 답변

[백엔드 내부]
  → 해당 폴더의 세션 요약 + Git 로그 수집
  → Claude Code 읽기 전용 모드로 실행
  → 현황 답변 생성 → 프론트 전달
```

### 5.3 세션 이어받기 플로우
```
[사용자 화면]
팀원 B가 사이드바에서 세션 클릭
  → 이전 대화 내역 표시 (스크롤로 확인)
  → 입력창에 이어서 작업 지시

[백엔드 내부]
  → 세션 락 획득
  → DB에서 대화 내역 로드 (UI 표시용)
  → claude --resume {session-id} -p "..." 실행
```

### 5.4 롤백 플로우
```
[사용자 화면]
팀원이 대시보드에서 커밋 타임라인 확인
  → 커밋 클릭 → Diff 뷰어에서 변경사항 확인
  → "롤백" 버튼 클릭 → 확인 다이얼로그 → 완료

[백엔드 내부]
  → simple-git으로 git revert 실행
  → 새 revert 커밋 생성 → 대시보드 갱신
```

---

## 6. DB 스키마

```sql
-- 사용자
users (
  id            UUID PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'member',  -- 'admin' | 'member'
  linux_user    VARCHAR(50),                   -- EC2 리눅스 유저명 (레거시 컬럼, 현재는 CLAUDE_CONFIG_DIR 방식 사용)
  auth_mode     VARCHAR(20) DEFAULT 'subscription', -- 'subscription' | 'api'
  claude_account TEXT,                          -- OAuth 연동 상태 마커 ("oauth_connected" 또는 null)
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 프로젝트 (Git 레포 1:1)
projects (
  id            UUID PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  repo_path     VARCHAR(500) NOT NULL,         -- /home/ubuntu/projects/{name}/
  description   TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 폴더 (기능/모듈 단위)
folders (
  id            UUID PRIMARY KEY,
  project_id    UUID REFERENCES projects(id),
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 세션 (Claude Code 세션과 매핑)
sessions (
  id            UUID PRIMARY KEY,
  folder_id     UUID REFERENCES folders(id),
  claude_session_id VARCHAR(100),              -- Claude Code JSONL 세션 ID
  title         VARCHAR(300) NOT NULL,
  locked_by     UUID REFERENCES users(id),
  locked_at     TIMESTAMP,
  created_by    UUID REFERENCES users(id),
  status        VARCHAR(20) DEFAULT 'active',  -- 'active' | 'archived'
  worktree_path VARCHAR(500),                  -- /home/ubuntu/projects-wt/{프로젝트명}/{세션ID}/
  branch_name   VARCHAR(200),                  -- session/{세션ID}
  merge_status  VARCHAR(20) DEFAULT 'working', -- 'working' | 'merged' | 'conflict'
  created_at    TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
)

-- 메시지 (대화 기록)
messages (
  id            UUID PRIMARY KEY,
  session_id    UUID REFERENCES sessions(id),
  user_id       UUID REFERENCES users(id),
  role          VARCHAR(20) NOT NULL,          -- 'user' | 'assistant'
  content       TEXT NOT NULL,
  type          VARCHAR(30),                   -- 'text' | 'tool_use' | 'tool_result' | 'error'
  metadata      JSONB,                         -- 추가 메타데이터 (파일 경로, 도구 사용 등)
  token_count   INTEGER,
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 커밋 로그
commits (
  id            UUID PRIMARY KEY,
  session_id    UUID REFERENCES sessions(id),
  project_id    UUID REFERENCES projects(id),
  hash          VARCHAR(40) NOT NULL,
  message       TEXT,
  author        VARCHAR(100),
  triggered_by  UUID REFERENCES users(id),     -- 커밋을 유발한 사용자
  files_changed JSONB,                         -- ["src/auth.ts", "src/login.ts"]
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 사용량 로그
usage_logs (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  session_id    UUID REFERENCES sessions(id),
  input_tokens  INTEGER,
  output_tokens INTEGER,
  duration_ms   INTEGER,
  cost_usd      DECIMAL(10, 6),
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 프로젝트 멤버
project_members (
  id            UUID PRIMARY KEY,
  project_id    UUID REFERENCES projects(id),
  user_id       UUID REFERENCES users(id),
  role          VARCHAR(20) DEFAULT 'member',  -- 'admin' | 'member'
  joined_at     TIMESTAMP DEFAULT NOW()
)

-- 알림
notifications (
  id            UUID PRIMARY KEY,
  user_id       UUID REFERENCES users(id),
  type          VARCHAR(50) NOT NULL,          -- 'lock_request' | 'merge_complete' | 'conflict' 등
  payload       JSONB,                         -- 알림 상세 데이터
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
)

-- 사용자 인증 세션 (@fastify/session용)
user_sessions (
  sid           VARCHAR PRIMARY KEY,
  sess          JSONB NOT NULL,
  expire        TIMESTAMP NOT NULL
)
```

---

## 7. 팀 구성 및 비용

### 팀 구성
- 6인 팀 (SSAFY)
- 전원 자연어 코딩으로 개발 참여

### 비용 구조
| 항목 | 비용 | 비고 |
|------|------|------|
| Claude 구독 (기본) | 개인 부담 | Pro $20/월 또는 Max $100/월 |
| 팀 공용 API 키 (백업) | 사용량 기반 | 구독 토큰 소진 시 관리자가 DB에서 전환 |
| EC2 | ~$50-100/월 | t3.large 이상 권장 |
| PostgreSQL | 호스트 직접 설치 | 추가 비용 없음 |
| 도메인 + HTTPS | ~$15/년 | Route53 + Let's Encrypt |

### 인증 모드
| 모드 | 인증 방식 | 과금 | 상태 |
|------|-----------|------|------|
| **구독 모드 (기본)** | Claude OAuth (PKCE) + CLAUDE_CONFIG_DIR 사용자별 분리 | 월 고정 (개인 구독) | 지원 |
| **API 모드** | 회사 공용 `ANTHROPIC_API_KEY` | 토큰 사용량 기반 | **미지원 (차단)** |

- 모든 팀원은 **구독 모드**로만 운영한다
- 팀원별 OAuth 인증: Nexus 웹에서 "Claude 연동" 버튼 클릭 → OAuth PKCE 흐름 → `credentials.json`이 `CLAUDE_CONFIG_DIR/{userId}/`에 저장
- Claude Code CLI 실행 시 `CLAUDE_CONFIG_DIR` 환경변수로 사용자별 인증 디렉토리를 지정하여 완전한 인증 분리 보장
- API 모드는 보안 정책상 차단됨 (회사 API 키를 여러 사용자가 공유하는 것은 허용하지 않음)

---

## 8. 개발 우선순위 (MVP → 확장)

### Phase 1: MVP (2~3주)
- [ ] EC2 환경 세팅 (Node.js + PostgreSQL + Claude Code CLI 설치)
- [ ] 채팅 UI (Claude 웹 스타일) + Claude Code CLI 래핑 (스트리밍)
- [ ] 3계층 구조 CRUD (프로젝트 > 폴더 > 세션)
- [ ] 기본 인증 (세션 기반, @fastify/session + PostgreSQL session store)
- [ ] 프로젝트별 CLAUDE.md / skills.md 자동 인식 확인

### Phase 2: 협업 기능 (2주)
- [ ] 세션 락/해제 (WebSocket)
- [ ] 세션 이어받기 (`--resume` 연동)
- [ ] Claude Code JSONL ↔ DB 동기화
- [ ] 실시간 알림

### Phase 3: 대시보드 + Git + PM (2주)
- [ ] 팀 대시보드 (작업 현황)
- [ ] Git 커밋 타임라인 시각화
- [ ] Diff 뷰어 + 원클릭 롤백
- [ ] PM 질의 기능 (히스토리 기반 현황 답변)

### Phase 4: 완성도 (1~2주)
- [ ] 터미널/로그 뷰어 (xterm.js)
- [ ] Skills 웹 편집기 (Monaco Editor)
- [ ] 모바일 반응형
- [ ] 에러 핸들링 강화
- [ ] 보안 강화 (명령 실행 권한 제어)

---

## 9. 개발 서버 운영 방침

### 개발 중 빌드/테스트 확인
- EC2에서 개발 서버를 띄우면 Nginx를 통해 외부 접속 가능
- 예: `dev.nexus.com:3000` → EC2의 프론트 개발 서버
- 예: `dev.nexus.com:8080` → EC2의 백엔드 API 서버

### 운영 방식 (공용 개발 서버)
- 팀 전체가 하나의 개발 서버 URL을 공유
- 코드 수정 시 서버 자동 재시작 (Skills에 규칙 정의)
- 모든 팀원이 같은 URL로 결과 확인
- 규모가 커지면 팀원별 포트 할당 방식으로 전환 가능

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 컨텍스트 윈도우 초과 | 긴 세션에서 AI 품질 저하 | Claude Code auto-compaction + Skills에 Compact Instructions 정의 |
| AI 파일 수정 오류 | 코드 손상 | Skills에 자동 커밋 규칙 → 즉시 롤백 |
| 동시 세션 파일 충돌 | 코드 꼬임 | git worktree로 세션별 작업 디렉토리 격리 |
| EC2 단일 장애점 | 전체 서비스 중단 | Git 원격(GitHub) 백업 + EC2 스냅샷 |
| Claude Code 동시 실행 | JSONL 오염 가능 | worktree로 cwd 분리 + 세션별 독립 claude_session_id |
| 팀원 구독 인증 관리 | EC2에서 여러 계정 전환 필요 | Claude OAuth PKCE + CLAUDE_CONFIG_DIR로 사용자별 인증 디렉토리 분리 |
| 명령 실행 보안 | 시스템 손상 가능 | `--allowedTools`로 권한 제어 + Skills에 허용 명령 정의 |