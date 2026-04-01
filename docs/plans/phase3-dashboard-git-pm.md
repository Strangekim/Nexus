# Phase 3: 대시보드 + Git + PM (2주)

> 목표: 팀 작업 현황 시각화, Git 커밋 관리(타임라인/Diff/롤백), PM 자연어 질의 구현

---

## 3.1 Git 커밋 동기화 + 타임라인

### 목표
Claude Code가 생성한 커밋을 DB에 자동 동기화하고, 커밋 타임라인 UI 구현

### 구현 파일
```
backend/src/
├── services/
│   └── commit-sync.service.ts   -- git log 조회 → DB 동기화
├── routes/
│   └── projects/
│       └── commits/
│           ├── index.ts         -- GET /api/projects/:id/commits
│           └── [hash]/
│               ├── diff.ts      -- GET /api/projects/:id/commits/:hash/diff
│               └── revert.ts    -- POST /api/projects/:id/commits/:hash/revert

frontend/src/
├── app/(main)/projects/[projectId]/
│   └── commits/
│       ├── page.tsx             -- 커밋 타임라인 페이지
│       └── [hash]/
│           └── page.tsx         -- Diff 뷰어 페이지
├── components/
│   └── git/
│       ├── CommitTimeline.tsx   -- 커밋 목록 (세션별 색 구분)
│       ├── CommitCard.tsx       -- 개별 커밋 카드
│       ├── CommitGraph.tsx      -- react-flow 커밋 그래프 (dynamic import)
│       ├── CommitGraphClient.tsx -- react-flow 클라이언트 컴포넌트
│       ├── DiffViewer.tsx       -- Monaco Diff Editor 래퍼
│       └── RevertButton.tsx     -- 롤백 버튼 + 확인 다이얼로그
```

### 구현 단계

1. **백엔드: 커밋 동기화 서비스**
   ```typescript
   class CommitSyncService {
     async syncNewCommits(projectId: string, sessionId: string, worktreePath: string) {
       const git = simpleGit(worktreePath);
       // DB에서 마지막 동기화된 커밋 해시 조회
       const lastCommit = await prisma.commit.findFirst({
         where: { projectId },
         orderBy: { createdAt: 'desc' },
       });
       // git log로 새 커밋 조회
       const log = await git.log({ from: lastCommit?.hash, to: 'HEAD' });
       // 새 커밋을 DB에 저장 + WebSocket 브로드캐스트
       for (const entry of log.all) {
         const commit = await prisma.commit.upsert({ ... });
         socketService.emitToProject(projectId, 'git:commit-new', commit);
       }
     }
   }
   ```
   - 채팅 응답 완료(`done` 이벤트) 후 자동 호출
   - `files_changed`: `git diff-tree --no-commit-id --name-only -r {hash}`로 추출

2. **백엔드: 커밋 API**
   - `GET /api/projects/:id/commits`: 페이지네이션 + 필터 (sessionId, author, since/until)
   - `GET /api/projects/:id/commits/:hash/diff`: `git.diff([hash + '^', hash])` + 파일별 파싱
   - `POST /api/projects/:id/commits/:hash/revert`:
     1. 활성 세션 경고 체크
     2. `git.revert(hash)` 실행
     3. 충돌 시 `git revert --abort` + 409 에러
     4. 성공 시 revert 커밋 DB 동기화

3. **프론트엔드: 커밋 타임라인**
   - 세션별 색상 코딩 (해시 기반 색상 생성)
   - 커밋 카드: 메시지, 작성자, 시간, 변경 파일 수
   - 필터: 세션별, 작성자별, 기간별
   - 무한 스크롤 (TanStack Query useInfiniteQuery)

4. **프론트엔드: Diff 뷰어**
   - Monaco Diff Editor (dynamic import, SSR 비활성화)
   - 파일별 탭 또는 목록으로 Diff 표시
   - additions/deletions 통계 표시

5. **프론트엔드: 롤백**
   - `RevertButton` → `AlertDialog`로 확인
   - 활성 세션 경고 표시
   - 성공/실패 토스트 알림

### 의존성
- Phase 1 (세션 CRUD, 채팅)
- Phase 2 (WebSocket - `git:commit-new` 이벤트)

### 완료 기준
- [ ] 채팅 완료 후 새 커밋이 자동으로 DB에 동기화
- [ ] 커밋 타임라인에서 세션별 색 구분 표시
- [ ] 커밋 클릭 → Diff 뷰어에서 변경사항 확인
- [ ] 롤백 → revert 커밋 생성 + 타임라인 실시간 갱신
- [ ] `git:commit-new` WebSocket 이벤트로 실시간 업데이트

---

## 3.2 세션 아카이브 + Merge

### 목표
세션 작업 완료 시 worktree 브랜치를 main에 merge하고 정리하는 파이프라인 구현

### 구현 파일
```
backend/src/services/
├── merge.service.ts             -- merge 실행 + AI 충돌 해결
├── merge-queue.service.ts       -- 프로젝트별 merge 직렬화 큐
└── session.service.ts           -- 아카이브 로직에 merge 통합
```

### 구현 단계

1. **백엔드: Merge Queue**
   ```typescript
   import { Mutex } from 'async-mutex';

   class MergeQueueService {
     private queues: Map<string, Mutex> = new Map();

     private getQueue(projectId: string): Mutex {
       if (!this.queues.has(projectId)) {
         this.queues.set(projectId, new Mutex());
       }
       return this.queues.get(projectId)!;
     }

     async executeMerge(projectId: string, fn: () => Promise<void>): Promise<void> {
       const mutex = this.getQueue(projectId);
       const release = await mutex.acquire();
       try {
         await fn();
       } finally {
         release();
       }
     }
   }
   ```

2. **백엔드: Merge 서비스**
   ```typescript
   class MergeService {
     async mergeSessionToMain(session: Session, project: Project): Promise<MergeResult> {
       return mergeQueue.executeMerge(project.id, async () => {
         const git = simpleGit(project.repoPath);
         // 1. main 체크아웃
         await git.checkout('main');
         // 2. merge 시도
         try {
           await git.merge([session.branchName]);
           return { status: 'merged' };
         } catch (err) {
           // 3. 충돌 → AI 자동 해결 시도
           return this.resolveConflictsWithAI(project, session);
         }
       });
     }

     private async resolveConflictsWithAI(project: Project, session: Session) {
       // 충돌 파일 목록 수집
       const git = simpleGit(project.repoPath);
       const conflictFiles = await git.diff(['--name-only', '--diff-filter=U']);
       // Claude Code로 충돌 해결
       const proc = spawn('claude', [
         '-p', `다음 파일들의 merge 충돌을 해결해줘: ${conflictFiles}`,
         '--allowedTools', 'Read,Edit,Bash',
         '--output-format', 'stream-json',
       ], { cwd: project.repoPath });
       // 완료 후 git add + commit
       await git.add('.');
       await git.commit(`Merge branch '${session.branchName}' (AI resolved conflicts)`);
       return { status: 'merged' };
     }
   }
   ```

3. **백엔드: 세션 아카이브 흐름**
   - `PATCH /api/sessions/:id` (status: 'archived') 시:
     1. `mergeService.mergeSessionToMain()` 실행
     2. 성공 → `mergeStatus: 'merged'`, `git worktree remove`
     3. 실패 → `mergeStatus: 'conflict'`
     4. WebSocket `session:archived` 브로드캐스트

4. **백엔드: 수동 Merge API**
   - `POST /api/sessions/:id/merge`: conflict 상태 세션 재시도
   - merge queue를 통해 직렬 실행

### 의존성
- 3.1 Git 커밋 동기화 (merge 커밋도 동기화)
- Phase 2 (세션 락)

### 완료 기준
- [ ] 세션 아카이브 시 worktree 브랜치가 main에 merge
- [ ] merge 충돌 → AI 자동 해결 시도
- [ ] 자동 해결 실패 → `mergeStatus: 'conflict'` + 수동 재시도 가능
- [ ] 동시 merge 요청 시 큐에서 순차 처리 (index.lock 충돌 없음)
- [ ] merge 완료 후 worktree 디렉토리 정리

---

## 3.3 팀 대시보드

### 목표
프로젝트의 작업 현황, 통계, 파일 변경 맵, 사용량을 시각화

### 구현 파일
```
backend/src/routes/projects/
└── dashboard/
    ├── activity.ts              -- GET /api/projects/:id/dashboard/activity
    ├── stats.ts                 -- GET /api/projects/:id/dashboard/stats
    ├── file-changes.ts          -- GET /api/projects/:id/dashboard/file-changes
    └── usage.ts                 -- GET /api/projects/:id/dashboard/usage

frontend/src/
├── app/(main)/
│   └── dashboard/
│       └── page.tsx             -- 대시보드 페이지
├── components/
│   └── dashboard/
│       ├── DashboardHeader.tsx  -- 프로젝트 선택 드롭다운 + 기간 필터
│       ├── ActivityPanel.tsx    -- 현재 작업 중인 세션/사용자
│       ├── StatsCards.tsx       -- 커밋 수, 세션 수, 메시지 수
│       ├── CommitsByUserChart.tsx  -- 사용자별 커밋 차트
│       ├── CommitsByFolderChart.tsx -- 폴더별 커밋 차트
│       ├── ActivityByDayChart.tsx  -- 일별 활동 차트
│       ├── FileChangeMap.tsx    -- 파일별 변경 빈도 표시
│       └── UsageTable.tsx       -- 팀원별 사용량 테이블
```

### 구현 단계

1. **백엔드: 대시보드 API (4개)**
   - `GET /dashboard/activity`: 현재 락 보유 세션 + 온라인 사용자
   - `GET /dashboard/stats`: 기간별 커밋/세션/메시지 집계 (Prisma groupBy)
   - `GET /dashboard/file-changes`: commits.files_changed JSONB에서 파일별 변경 빈도 집계
   - `GET /dashboard/usage`: usage_logs에서 사용자별 세션 수/메시지 수/사용 시간/비용 집계

2. **프론트엔드: 대시보드 레이아웃**
   - 상단: 프로젝트 선택 드롭다운 (URL query parameter `?projectId=xxx`)
   - 기간 필터: today / week / month (기본: week)
   - 반응형 그리드 레이아웃 (PC: 2~3 컬럼, 모바일: 1 컬럼)

3. **프론트엔드: 각 위젯**
   - `ActivityPanel`: 실시간 작업 카드 (WebSocket `dashboard:activity-updated`로 갱신)
   - `StatsCards`: 숫자 카드 (총 커밋, 총 세션, 총 메시지)
   - 차트: `recharts` 또는 순수 CSS/SVG (가볍게 유지)
   - `FileChangeMap`: 파일 경로 트리 형태 + 변경 빈도에 따른 히트맵 색상
   - `UsageTable`: 테이블 (사용 시간, 예상 비용)

4. **프론트엔드: 실시간 갱신**
   - `dashboard:activity-updated` → TanStack Query invalidation
   - `git:commit-new` → stats, file-changes 쿼리 invalidation

### 의존성
- 3.1 Git 커밋 동기화 (커밋 데이터)
- Phase 2 (WebSocket, 세션 락 - 활성 세션 표시)

### 완료 기준
- [ ] 대시보드에서 현재 작업 중인 팀원/세션 실시간 표시
- [ ] 기간별 통계 (커밋/세션/메시지 수) 표시
- [ ] 사용자별/폴더별 커밋 분포 차트
- [ ] 파일 변경 빈도 맵 표시
- [ ] 팀원별 사용량 표시
- [ ] 실시간 이벤트로 대시보드 자동 갱신

---

## 3.4 PM 질의 (프로젝트 현황 자연어 질의)

### 목표
PM이 프로젝트/폴더 단위로 자연어 질의 → AI가 세션 히스토리 + Git 로그 기반으로 답변

### 구현 파일
```
backend/src/
├── routes/projects/
│   ├── query.ts                 -- POST /api/projects/:id/query
│   └── folders/
│       └── query.ts             -- POST /api/projects/:id/folders/:folderId/query
├── services/
│   └── pm-query.service.ts      -- 컨텍스트 수집 + Claude Code 읽기 전용 실행

frontend/src/components/dashboard/
└── PMQueryInput.tsx             -- PM 질의 입력 + SSE 응답 표시
```

### 구현 단계

1. **백엔드: PM 질의 서비스**
   ```typescript
   class PMQueryService {
     async query(projectId: string, message: string, folderId?: string) {
       // 1. 컨텍스트 수집
       const sessions = await prisma.session.findMany({
         where: { folder: { projectId }, ...(folderId ? { folderId } : {}) },
         take: 10,
         orderBy: { updatedAt: 'desc' },
         include: { messages: { take: 5, orderBy: { createdAt: 'desc' } } },
       });
       const commits = await prisma.commit.findMany({
         where: { projectId },
         take: 50,
         orderBy: { createdAt: 'desc' },
       });

       // 2. 프롬프트 구성
       const contextPrompt = buildContextPrompt(sessions, commits, message);

       // 3. Claude Code 읽기 전용 실행
       const proc = spawn('claude', [
         '-p', contextPrompt,
         '--allowedTools', 'Read,Glob,Grep',
         '--output-format', 'stream-json',
       ], { cwd: project.repoPath });

       return proc; // SSE로 전달
     }
   }
   ```
   - 컨텍스트 제한: 최근 세션 10개 요약 + 최근 커밋 50개
   - 동시 PM 질의 제한: 프로젝트당 최대 2개 (세마포어)

2. **백엔드: PM 질의 라우트**
   - `POST /api/projects/:id/query`: 프로젝트 전체 범위
   - `POST /api/projects/:id/folders/:folderId/query`: 폴더 범위
   - SSE 스트리밍 응답 (채팅과 동일한 형식)
   - 세션 락 불필요 (읽기 전용)
   - 히스토리 저장하지 않음 (일회성)

3. **프론트엔드: PM 질의 UI**
   - 대시보드 페이지 상단에 `PMQueryInput` 배치
   - 입력 → SSE 스트리밍 → 응답 표시 (채팅과 동일한 마크다운 렌더링)
   - 응답 완료 후 입력 영역 리셋
   - 별도 세션 생성 없음, 일회성 질의/응답

### 의존성
- 3.1 Git 커밋 동기화 (커밋 데이터 컨텍스트)
- Phase 1 (Claude Code CLI 래핑, SSE 파서)

### 완료 기준
- [ ] 대시보드에서 "이번 주 뭘 했어?" 질의 → AI 답변 (SSE 스트리밍)
- [ ] 폴더 단위 질의 가능 ("인증 모듈 어디까지 진행됐어?")
- [ ] 읽기 전용 모드로 파일 수정 불가
- [ ] 히스토리 저장되지 않음
- [ ] 동시 질의 2개 제한 동작

---

## Phase 3 작업 순서 · 의존성 · 병렬 가능 여부

### 의존성 그래프

```
Phase 1~2 완료
 └──→ 3.1 Git 커밋 동기화 + 타임라인
       ├──→ 3.2 세션 아카이브 + Merge
       ├──→ 3.3 팀 대시보드
       └──→ 3.4 PM 질의
```

### 작업별 병렬 처리 가능 여부

| 작업 | 선행 작업 | 병렬 분리 가능? | 분리 방법 | 충돌 파일 |
|------|-----------|:---:|-----------|-----------|
| 3.1 Git 동기화 — 백엔드 | Phase 2 | **가능** ✅ | commit-sync 서비스 + commits 라우트 | `backend/src/services/commit-sync.service.ts` |
| 3.1 Git — 프론트 | Phase 2 | **가능** ✅ | CommitTimeline, DiffViewer 컴포넌트 | `frontend/src/components/git/` |
| 3.2 Merge 서비스 | 3.1 백엔드 | **불가** | session.service.ts 아카이브 로직에 merge 통합 | `session.service.ts` 수정 |
| 3.3 대시보드 — 백엔드 | 3.1 백엔드 | **가능** ✅ | 독립 라우트 (dashboard/) | `backend/src/routes/projects/dashboard/` |
| 3.3 대시보드 — 프론트 | 3.1 프론트 | **가능** ✅ | 독립 컴포넌트 (dashboard/) | `frontend/src/components/dashboard/` |
| 3.4 PM 질의 — 백엔드 | 3.1 백엔드 | **가능** ✅ | 독립 서비스 + 라우트 | `backend/src/services/pm-query.service.ts` |
| 3.4 PM 질의 — 프론트 | 3.1 프론트 | **가능** ✅ | PMQueryInput 컴포넌트 | `frontend/src/components/dashboard/PMQueryInput.tsx` |
| **3.2 vs 3.3 vs 3.4** | 모두 3.1만 의존 | **3.3, 3.4 병렬** ✅ | 3.2는 기존 서비스 수정이라 주의 | 3.3/3.4는 충돌 없음, 3.2는 독립 실행 권장 |

### 최적 실행 계획 (단일 에이전트)

```
Step 1: 3.1 Git 커밋 동기화 [백엔드 + 프론트엔드 병렬]
Step 2: 3.2 Merge + 3.3 대시보드 + 3.4 PM 질의 [병렬]
        - 3.2 백엔드 (merge 서비스, merge-queue, 아카이브 로직)
        - 3.3 백엔드 (대시보드 API 4개)
        - 3.3 프론트 (대시보드 위젯)
        - 3.4 백엔드 (PM 질의 서비스 + 라우트)
        ⚠️ 3.2는 session.service.ts 수정 → 다른 에이전트와 파일 충돌 주의
        → 안전하게: 3.2 순차 + 3.3/3.4 병렬
Step 3: 3.4 프론트 (PMQueryInput) — Step 2 대시보드 프론트에 포함 가능
```

**예상 Step 수: 2~3**
