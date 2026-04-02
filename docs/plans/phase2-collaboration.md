# Phase 2: 협업 기능 (2주)

> 목표: 여러 팀원이 동시에 작업할 수 있도록 세션 락, 실시간 동기화, 알림 시스템 구현

---

## 2.1 WebSocket 기반 실시간 인프라

### 목표
Socket.IO 서버/클라이언트 설정 + 룸 구조 + 이벤트 기반 통신 인프라 구축

### 구현 파일
```
backend/src/
├── plugins/
│   └── socket.ts                -- Socket.IO 서버 설정 + 세션 인증 미들웨어
├── services/
│   └── socket.service.ts        -- 룸 관리, 이벤트 브로드캐스트 유틸

frontend/src/
├── lib/
│   └── socket.ts                -- Socket.IO 클라이언트 싱글턴
├── hooks/
│   └── useRealtimeSync.ts       -- WebSocket 이벤트 → Zustand 스토어 매핑
├── stores/
│   ├── realtimeStore.ts         -- 세션 락, 온라인 사용자, 알림
│   └── uiStore.ts               -- 사이드바, 패널 상태
```

### 구현 단계

1. **백엔드: Socket.IO 서버**
   - Fastify에 Socket.IO 통합 (`new Server(fastify.server)`)
   - 세션 쿠키 기반 인증 미들웨어:
     ```typescript
     io.use(async (socket, next) => {
       const cookie = socket.handshake.headers.cookie;
       // connect.sid 파싱 → 세션 스토어에서 userId 조회
       // 유효하지 않으면 next(new Error('unauthorized'))
     });
     ```
   - 연결 시 사용자 ID를 소켓에 부착: `socket.data.userId = userId`

2. **백엔드: 룸 구조**
   - 프로젝트 룸: `project:{projectId}` — 프로젝트 단위 이벤트
   - 세션 룸: `session:{sessionId}` — 세션 상세 이벤트
   - 클라이언트 `join`/`leave` 이벤트 처리

3. **백엔드: 브로드캐스트 서비스**
   ```typescript
   class SocketService {
     emitToProject(projectId: string, event: string, data: unknown) {
       io.to(`project:${projectId}`).emit(event, { data, timestamp: new Date().toISOString() });
     }
     emitToSession(sessionId: string, event: string, data: unknown) { ... }
     emitToUser(userId: string, event: string, data: unknown) { ... }
   }
   ```

4. **프론트엔드: Socket.IO 클라이언트**
   - `withCredentials: true`로 쿠키 자동 전송
   - 싱글턴 패턴으로 재연결 관리
   - `(main)/layout.tsx`에서 연결 초기화

5. **프론트엔드: Zustand 스토어**
   - `realtimeStore`: sessionLocks(Map), onlineUsers(Map), notifications 배열
   - `uiStore`: sidebarOpen, terminalPanelSize, activePanel

6. **프론트엔드: useRealtimeSync 훅**
   - Socket.IO 이벤트 수신 → Zustand 스토어 업데이트 + TanStack Query invalidation
   - 프로젝트 룸 자동 join/leave (프로젝트 컨텍스트 변경 시)
   - 세션 룸 join/leave (세션 페이지 진입/이탈 시)

### 의존성
- Phase 1 완료 (인증, 세션 CRUD)

### 완료 기준
- [x] Socket.IO 연결 성공 (쿠키 인증)
- [x] 프로젝트 룸 join → 해당 프로젝트 이벤트 수신
- [x] 이벤트 발생 → Zustand 스토어 즉시 업데이트
- [x] 연결 끊김 → 자동 재연결

---

## 2.2 세션 락/해제

### 목표
한 세션에 한 명만 작업 가능하도록 락 메커니즘 구현 + 자동 해제 + 실시간 동기화

### 구현 파일
```
backend/src/
├── routes/sessions/
│   ├── lock.ts                  -- POST /api/sessions/:id/lock
│   ├── unlock.ts                -- POST /api/sessions/:id/unlock
│   ├── lock-request.ts          -- POST /api/sessions/:id/lock-request
│   └── lock-transfer.ts         -- POST /api/sessions/:id/lock-transfer
├── services/
│   └── lock.service.ts          -- 락 로직 + 자동 해제 타이머
│   └── notification.service.ts  -- 알림 생성 + WebSocket 전달

frontend/src/components/session/
├── LockStatusBadge.tsx          -- 락 상태 뱃지
├── LockRequestButton.tsx        -- 락 요청/해제 버튼
└── LockRequestDialog.tsx        -- 락 요청 메시지 다이얼로그
```

### 구현 단계

1. **백엔드: 락 서비스**
   ```typescript
   class LockService {
     async acquireLock(sessionId: string, userId: string): Promise<void> {
       // 트랜잭션으로 원자적 처리
       // 이미 본인 → lastActivityAt 갱신
       // 다른 사용자 → 409 SESSION_LOCKED
       // 미잠금 → locked_by, locked_at, last_activity_at 설정
     }

     async releaseLock(sessionId: string, userId: string): Promise<void> { ... }

     async transferLock(sessionId: string, fromUserId: string, toUserId: string): Promise<void> {
       // 트랜잭션: locked_by 직접 교체 (중간 상태 없음)
     }
   }
   ```

2. **백엔드: 자동 해제 타이머**
   - 서버 시작 시 `setInterval(checkExpiredLocks, 60_000)` 등록
   - `last_activity_at`이 15분 이상 지난 세션의 락 자동 해제
   - 해제 시 `session:lock-updated` 이벤트 브로드캐스트
   - 서버 시작 시 모든 `locked_by`를 `null`로 초기화 (고스트 락 방지)

3. **백엔드: 락 요청**
   - `POST /api/sessions/:id/lock-request`: 알림 생성 + WebSocket `session:lock-request` + `notification:new`
   - 락 보유자에게만 전달

4. **백엔드: 채팅 시 자동 락**
   - `POST /api/sessions/:id/chat` 핸들러 초반에 `lockService.acquireLock()` 호출
   - 채팅 시 `lastActivityAt` 자동 갱신

5. **프론트엔드: 락 상태 표시**
   - `LockStatusBadge`: 락 보유자 이름 + 시간 표시 (Zustand에서 조회)
   - 본인 락 → 초록 뱃지, 타인 락 → 빨강 뱃지, 미잠금 → 회색
   - 타인 락 상태에서 입력창 비활성화

6. **프론트엔드: 락 요청 UI**
   - `LockRequestButton`: 타인 락 세션에서 "작업 요청" 버튼
   - `LockRequestDialog`: 요청 메시지 입력 다이얼로그
   - 락 요청 수신 시 토스트 알림 표시

### 의존성
- 2.1 WebSocket 인프라

### 완료 기준
- [x] 세션 진입 시 락 자동 획득 (채팅 시)
- [x] 타인 락 세션에서 입력 불가 + 락 요청 가능
- [x] 15분 무입력 시 락 자동 해제
- [x] 락 상태 변경이 실시간으로 모든 클라이언트에 반영
- [x] 락 이전(transfer) API 동작

---

## 2.3 세션 이어받기 + JSONL 동기화

### 목표
다른 팀원이 시작한 세션을 이어서 작업할 수 있도록 Claude Code `--resume` 연동

### 구현 파일
```
backend/src/services/
├── claude.service.ts            -- --resume 지원 추가
└── session.service.ts           -- claudeSessionId 매핑 로직

frontend/src/components/chat/
└── ChatPanel.tsx                -- 세션 이어받기 흐름 통합
```

### 구현 단계

1. **백엔드: 세션 이어받기 로직**
   - 첫 채팅: `claude -p "..." --output-format stream-json` → 응답에서 `session_id` 추출 → DB에 `claudeSessionId` 저장
   - 이후 채팅: `claude -p "..." --resume {claudeSessionId} --output-format stream-json`
   - 다른 사용자가 이어받아도 동일한 `claudeSessionId`로 resume

2. **백엔드: CLAUDE_CONFIG_DIR 기반 인증 분리 (구독 모드)**
   ```typescript
   // 구독 모드: 사용자별 CLAUDE_CONFIG_DIR로 OAuth 자격증명 분리
   if (user.authMode === 'subscription') {
     const configDir = `${process.env.CLAUDE_CONFIGS_DIR}/${session.creator.id}`;
     spawnOptions.env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };
   }
   // API 모드는 현재 미지원 — 차단
   ```

3. **백엔드: JSONL 파일 접근 (세션 이어받기)**
   - 세션 이어받기 시 생성자의 `CLAUDE_CONFIG_DIR`을 그대로 참조하여 `--resume` 실행
   - `CLAUDE_CONFIG_DIR/{creator.id}/projects/{hash}/*.jsonl` 경로에서 JSONL에 접근
   - 동일 서버 프로세스가 실행하므로 별도 파일 권한 설정 불필요 (백엔드 프로세스가 해당 디렉토리에 접근권한 보유)

4. **프론트엔드: 이어받기 UX**
   - 다른 팀원의 세션 클릭 → 이전 대화 히스토리 로드 (읽기 전용)
   - 락 획득 후 입력 가능 → 입력 시 `--resume`으로 이어가기
   - 세션 헤더에 원래 생성자 정보 표시

### 의존성
- 2.2 세션 락 (이어받기 전 락 필요)
- Claude OAuth 연동 완료 (사용자별 credentials.json 존재)

### 완료 기준
- [x] 팀원 A가 시작한 세션에서 팀원 B가 이어서 작업 가능
- [x] `--resume`으로 Claude Code 컨텍스트 유지
- [x] 구독 모드에서 CLAUDE_CONFIG_DIR 기반 인증 분리 동작
- [ ] API 모드 — 현재 미지원 (차단됨, 향후 정책 결정 후 구현)

---

## 2.4 실시간 알림

### 목표
락 요청, 작업 완료 등 이벤트를 사용자에게 실시간 알림으로 전달

### 구현 파일
```
backend/src/
├── routes/
│   └── notifications/
│       ├── index.ts             -- GET /api/notifications
│       ├── [id].ts              -- PATCH/DELETE /api/notifications/:id
│       └── read-all.ts          -- PATCH /api/notifications/read-all
├── services/
│   └── notification.service.ts  -- 알림 생성 + WebSocket 전달

frontend/src/
├── app/(main)/
│   └── notifications/
│       └── page.tsx             -- 알림 목록 페이지
├── components/
│   └── notification/
│       ├── NotificationBell.tsx  -- 헤더 알림 아이콘 (미읽음 카운트)
│       ├── NotificationDropdown.tsx -- 알림 드롭다운
│       └── NotificationItem.tsx -- 개별 알림 항목
```

### 구현 단계

1. **백엔드: 알림 서비스**
   ```typescript
   class NotificationService {
     async create(userId: string, type: string, payload: object): Promise<Notification> {
       const notif = await prisma.notification.create({ ... });
       // WebSocket으로 즉시 전달
       socketService.emitToUser(userId, 'notification:new', notif);
       return notif;
     }
   }
   ```
   - type 값: `lock_request`, `lock_released`, `task_complete`, `mention` (snake_case)

2. **백엔드: 알림 REST API**
   - `GET /api/notifications`: 내 알림 목록 (isRead 필터 가능)
   - `PATCH /api/notifications/:id`: 읽음 처리
   - `PATCH /api/notifications/read-all`: 전체 읽음 처리
   - `DELETE /api/notifications/:id`: 삭제

3. **프론트엔드: 알림 UI**
   - `NotificationBell`: 헤더에 벨 아이콘 + 미읽음 카운트 뱃지
   - `NotificationDropdown`: 클릭 시 최근 알림 목록 드롭다운
   - 알림 클릭 → 읽음 처리 + 해당 세션으로 이동

4. **프론트엔드: 실시간 수신**
   - `useRealtimeSync`에서 `notification:new` 이벤트 → `addNotification()` 호출
   - 토스트로 즉시 알림 표시 (shadcn/ui의 Sonner 또는 Toast)

### 의존성
- 2.1 WebSocket 인프라
- 2.2 세션 락 (lock_request 알림 트리거)

### 완료 기준
- [x] 락 요청 시 락 보유자에게 실시간 알림
- [x] 알림 벨에 미읽음 카운트 표시
- [x] 알림 클릭 → 해당 세션으로 이동
- [x] 전체 읽음 처리 동작
- [x] 토스트 알림 즉시 표시

---

## Phase 2 작업 순서 · 의존성 · 병렬 가능 여부

### 의존성 그래프

```
Phase 1 완료
 └──→ 2.1 WebSocket 인프라
       ├──→ 2.2 세션 락/해제
       │     └──→ 2.3 세션 이어받기 + JSONL
       └──→ 2.4 실시간 알림
```

### 작업별 병렬 처리 가능 여부

| 작업 | 선행 작업 | 병렬 분리 가능? | 분리 방법 | 충돌 파일 |
|------|-----------|:---:|-----------|-----------|
| 2.1 WebSocket — 백엔드 | Phase 1 | **가능** ✅ | Socket.IO 서버 플러그인 | `backend/src/plugins/socket.ts` |
| 2.1 WebSocket — 프론트 | Phase 1 | **가능** ✅ | 클라이언트 + Zustand 스토어 | `frontend/src/lib/socket.ts`, `frontend/src/stores/` |
| 2.2 세션 락 | 2.1 | **가능** ✅ | 백엔드: lock 라우트+서비스 / 프론트: LockBadge, Button | 파일 겹침 없음 |
| 2.3 세션 이어받기 | 2.2 | **불가** | claude.service.ts에 resume 로직 추가 (기존 파일 수정) | `claude.service.ts` |
| 2.4 실시간 알림 | 2.1 | **가능** ✅ | 백엔드: notification 라우트 / 프론트: Bell+Dropdown | 파일 겹침 없음 |
| **2.2 vs 2.4** | 둘 다 2.1만 의존 | **병렬 가능** ✅ | 독립 라우트/컴포넌트 | 충돌 없음 |

### 최적 실행 계획 (단일 에이전트)

```
Step 1: 2.1 WebSocket [백엔드 + 프론트엔드 병렬]
Step 2: 2.2 세션 락 + 2.4 실시간 알림 [4개 서브에이전트 병렬]
        - 2.2 백엔드 (lock 라우트 + 서비스)
        - 2.2 프론트 (LockBadge, LockRequestButton)
        - 2.4 백엔드 (notification 라우트 + 서비스)
        - 2.4 프론트 (NotificationBell, Dropdown)
Step 3: 2.3 세션 이어받기 (순차 — claude.service.ts 기존 파일 수정)
```

**예상 Step 수: 3**
