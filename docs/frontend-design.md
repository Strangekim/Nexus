# Nexus 프론트엔드 설계 문서

---

## 0. 디자인 시스템 & 톤앤매너

### 0.1 디자인 레퍼런스

Nexus의 UI/UX는 **Claude Web(claude.ai)** 및 **Claude Desktop** 앱을 핵심 레퍼런스로 삼는다. 사용자가 Claude 제품군에서 느끼는 경험을 최대한 유지하되, 팀 협업/PM 기능에 맞게 확장한다.

#### Claude UI 참고 포인트

| 요소 | Claude 레퍼런스 | Nexus 적용 |
|------|----------------|------------|
| **채팅 레이아웃** | 중앙 정렬 채팅 영역, 하단 입력창, 깔끔한 여백 | 그대로 적용. 채팅 메시지 영역을 중앙에 배치하고 최대 너비 제한 (max-w-3xl) |
| **메시지 스타일** | 사용자: 우측 정렬 말풍선, AI: 좌측 정렬 평문 | 동일하게 적용. 사용자 메시지는 배경색 있는 말풍선, AI는 배경 없는 평문 |
| **사이드바** | 좌측 대화 목록, 접기 가능, 다크 배경 | 3계층 트리(프로젝트>폴더>세션)로 확장. 접기/펼치기 동일 |
| **입력창** | 둥근 모서리, 자동 높이 조절, 첨부/전송 버튼 | 동일 형태. 전송 버튼 + 중지 버튼(스트리밍 중) |
| **코드 블록** | 다크 배경, 언어 라벨, 복사 버튼 | 동일. syntax highlighter + 복사 버튼 |
| **도구 사용 표시** | 접기 가능한 카드, 실행 상태 아이콘 | 동일. ToolUseCard로 구현 |
| **스트리밍** | 커서 블링크, 점진적 텍스트 표시 | 동일. 커서 애니메이션 + 마크다운 점진적 렌더링 |
| **라이트 모드** | Claude Web의 라이트 톤 | 라이트 모드 기본. 배경 `#F5F5EF`, 카드 white 기반으로 커스터마이징 |

#### 차별화 요소 (Claude에 없는 Nexus 고유 기능)
- 좌측 사이드바: 단순 대화 목록 → 프로젝트/폴더/세션 3계층 트리
- 하단 터미널 패널: 도구 실행 로그를 xterm.js로 표시
- 세션 헤더: 락 상태 뱃지, 작업자 아바타
- 대시보드: 팀 활동 시각화 (Claude에 없는 페이지)
- 알림 벨: 실시간 락 요청/작업 완료 알림

### 0.2 로고 & 브랜드

로고 파일: `/logo.png` (2120x556, RGBA)

로고는 6방향 별(asterisk) 심볼 + "nexus" 소문자 워드마크로 구성되며, 틸(teal)에서 코랄(coral)로 이어지는 그라데이션이 특징이다.

### 0.3 컬러 시스템

로고에서 추출한 브랜드 컬러를 기반으로 UI 전체 색상 체계를 구성한다.

#### 브랜드 컬러 팔레트

| 이름 | HEX | HSL (근사값) | 용도 |
|------|-----|-------------|------|
| **Teal Dark** | `#1B605B` | `175 55% 24%` | 사이드바 배경, 주요 액센트 |
| **Teal Mid** | `#2D7D7B` | `179 46% 33%` | Primary 버튼, 링크, 활성 상태 |
| **Teal Light** | `#426A66` | `174 24% 34%` | 보조 텍스트, 비활성 아이콘 |
| **Olive** | `#8A9A5E` | `78 25% 49%` | 그라데이션 중간톤, 성공 상태 |
| **Sand** | `#DFA770` | `28 65% 66%` | 경고, 보류 상태, 보조 액센트 |
| **Coral** | `#E0845E` | `18 68% 63%` | 강조, CTA 보조, 알림 뱃지 |
| **Coral Light** | `#E8A88A` | `18 63% 72%` | 호버 상태, 하이라이트 |

#### 시맨틱 컬러 (라이트 모드 기본)

| 시맨틱 | CSS 변수 | 값 (라이트) | 설명 |
|--------|----------|------------|------|
| `--background` | 배경 | `#F5F5EF` | 메인 배경 (Claude Web 라이트 톤 참고) |
| `--background-secondary` | 보조 배경 | `#FFFFFF` | 카드, 입력 영역 배경 |
| `--background-sidebar` | 사이드바 | `#0F3433` | Teal Dark 기반 사이드바 (라이트에서도 유지) |
| `--foreground` | 기본 텍스트 | `#1A1A1A` | 진한 텍스트 |
| `--foreground-muted` | 보조 텍스트 | `#6B7280` | 비활성, 타임스탬프 |
| `--primary` | 주요 색상 | `#2D7D7B` | Teal Mid — 버튼, 링크 |
| `--primary-foreground` | 주요 위 텍스트 | `#FFFFFF` | Primary 위 흰 텍스트 |
| `--accent` | 강조 색상 | `#E0845E` | Coral — CTA 보조, 뱃지 |
| `--accent-foreground` | 강조 위 텍스트 | `#FFFFFF` | Accent 위 흰 텍스트 |
| `--destructive` | 위험 | `#E05252` | 삭제, 에러 |
| `--success` | 성공 | `#4CAF50` | 성공 토스트, 완료 상태 |
| `--warning` | 경고 | `#DFA770` | Sand — 경고, 보류 |
| `--border` | 테두리 | `#E5E5E0` | 구분선, 카드 테두리 |
| `--ring` | 포커스 링 | `#2D7D7B` | Teal Mid — 포커스 표시 |
| `--input` | 입력 배경 | `#FFFFFF` | 입력 필드 배경 |

#### 그라데이션

로고의 Teal→Coral 그라데이션을 브랜드 시그니처로 활용한다.

```css
/* 브랜드 그라데이션 — 로고, 로딩 바, 강조 영역에 사용 */
--gradient-brand: linear-gradient(135deg, #1B605B 0%, #8A9A5E 40%, #DFA770 70%, #E0845E 100%);

/* 사이드바 선택 항목 배경 */
--gradient-sidebar-active: linear-gradient(90deg, rgba(45,125,123,0.2) 0%, transparent 100%);

/* 버튼 호버 그라데이션 */
--gradient-button-hover: linear-gradient(135deg, #2D7D7B 0%, #3A9A97 100%);
```

### 0.4 타이포그래피

| 요소 | 폰트 | 사이즈 | 비고 |
|------|------|--------|------|
| 로고 워드마크 | 로고 이미지 사용 | — | 텍스트 렌더링 금지, 이미지만 사용 |
| 헤딩 (H1~H3) | `Inter` (시스템 폰트 폴백) | 24/20/16px | `font-semibold` |
| 본문 텍스트 | `Inter` | 14px | `font-normal`, `leading-relaxed` |
| 코드 | `JetBrains Mono`, `Menlo`, monospace | 13px | 코드 블록, 터미널 |
| 채팅 메시지 | `Inter` | 15px | 가독성을 위해 본문보다 1px 크게 |
| 사이드바 | `Inter` | 13px | 밀도 높은 트리 구조 |
| 뱃지/라벨 | `Inter` | 11px | `font-medium`, `uppercase` (선택) |

### 0.5 간격 & 레이아웃 원칙

Claude Web의 여유로운 여백감을 유지한다.

| 원칙 | 값 | 적용 |
|------|---|------|
| 메시지 간격 | `24px` (`gap-6`) | 채팅 메시지 사이 |
| 메시지 최대 너비 | `768px` (`max-w-3xl`) | 채팅 영역 중앙 정렬 |
| 사이드바 너비 | `260px` | Claude Web과 동일 |
| 패딩 | `16~24px` | 카드, 패널 내부 |
| 둥글기 | `8~12px` (`rounded-lg~xl`) | 카드, 버튼, 입력창 |
| 입력창 높이 | 최소 `48px`, 최대 `200px` | 자동 확장 |

### 0.6 아이콘

`lucide-react` 아이콘을 사용한다 (shadcn/ui 기본 아이콘 세트).

| 용도 | 아이콘 | 비고 |
|------|--------|------|
| 프로젝트 | `FolderGit2` | 사이드바 트리 |
| 폴더 | `Folder` / `FolderOpen` | 열림/닫힘 |
| 세션 | `MessageSquare` | 채팅 아이콘 |
| 락 (본인) | `Lock` (초록) | 본인 락 |
| 락 (타인) | `Lock` (빨강) | 타인 락 |
| 미잠금 | `Unlock` (회색) | 사용 가능 |
| 전송 | `ArrowUp` | Claude Web과 동일 |
| 중지 | `Square` (채워진) | 스트리밍 중지 |
| 알림 | `Bell` | 헤더 알림 |
| 설정 | `Settings` | 프로젝트 설정 |
| 롤백 | `RotateCcw` | 커밋 롤백 |

### 0.7 상태별 컬러 매핑

| 상태 | 색상 | Badge 스타일 | 사용처 |
|------|------|-------------|--------|
| Active (진행 중) | Teal Mid `#2D7D7B` | 채움 + 흰 텍스트 | 세션 상태 |
| Locked (본인) | Teal Mid `#2D7D7B` | 아웃라인 + 아이콘 | 세션 락 |
| Locked (타인) | Coral `#E0845E` | 채움 + 흰 텍스트 | 세션 락 |
| Archived | `#6B7280` (gray-500) | 아웃라인 | 세션 상태 |
| Online | `#4CAF50` (green) | 점(dot) | 사용자 상태 |
| Offline | `#6B7280` (gray) | 점(dot) | 사용자 상태 |
| Processing | Teal Mid + pulse | 점멸 | AI 작업 중 |
| Conflict | Coral `#E0845E` | 채움 | merge 충돌 |
| Merged | `#4CAF50` (green) | 채움 | merge 완료 |

### 0.8 globals.css 구현

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Nexus 브랜드 — 라이트 모드 (기본) */
    --background: 60 11% 95%;          /* #F5F5EF */
    --background-secondary: 0 0% 100%; /* #FFFFFF — 카드, 입력 영역 */
    --background-sidebar: 175 55% 13%; /* #0F3433 — Teal Dark 사이드바 */
    --foreground: 0 0% 10%;            /* #1A1A1A */
    --foreground-muted: 220 9% 46%;    /* #6B7280 */

    --primary: 179 46% 33%;            /* #2D7D7B — Teal Mid */
    --primary-foreground: 0 0% 100%;

    --accent: 18 68% 63%;              /* #E0845E — Coral */
    --accent-foreground: 0 0% 100%;

    --warning: 28 65% 66%;             /* #DFA770 — Sand */
    --destructive: 0 65% 60%;          /* #E05252 */
    --success: 122 39% 49%;            /* #4CAF50 */

    --border: 60 10% 88%;              /* #E5E5E0 */
    --input: 0 0% 100%;                /* #FFFFFF */
    --ring: 179 46% 33%;               /* Teal Mid */

    --card: 0 0% 100%;
    --card-foreground: 0 0% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 10%;
    --muted: 60 5% 93%;
    --muted-foreground: 220 9% 46%;

    /* 브랜드 그라데이션 */
    --gradient-brand: linear-gradient(135deg, #1B605B 0%, #8A9A5E 40%, #DFA770 70%, #E0845E 100%);
  }
}

/* 스크롤바 스타일 (Claude Web 참고) */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--foreground-muted));
}
```

### 0.9 로고 사용 가이드

| 위치 | 형태 | 크기 | 비고 |
|------|------|------|------|
| 로그인 페이지 | 심볼 + 워드마크 (전체) | 높이 48px | 중앙 정렬 |
| 사이드바 상단 | 심볼만 (접힌 상태) / 전체 (펼친 상태) | 높이 28px | 좌측 정렬 |
| 파비콘 | 심볼만 (별) | 32x32 / 16x16 | ICO 또는 SVG |
| 모바일 헤더 | 심볼만 | 높이 24px | 좌측 정렬 |

로고 이미지 경로: `public/logo.png` (전체), `public/logo-symbol.png` (심볼만 — 별도 추출 필요)

---

## 1. 라우트 구조

### 1.1 디렉토리 / 라우트 맵

Next.js App Router 기반으로 `(auth)`와 `(main)` Layout Group을 분리하여 인증 전/후 레이아웃을 독립적으로 관리한다.

```
app/
  layout.tsx                          -- 루트 레이아웃 (html, body, 글로벌 Provider)
  (auth)/
    layout.tsx                        -- 인증 레이아웃 (중앙 정렬, 로고)
    login/
      page.tsx                        -- 로그인 페이지
  (main)/
    layout.tsx                        -- 사이드바 공통 레이아웃
    dashboard/
      page.tsx                        -- 팀 대시보드 (프로젝트 선택 드롭다운 포함)
    projects/[projectId]/
      layout.tsx                      -- 프로젝트 컨텍스트 Provider
      folders/[folderId]/
        sessions/[sessionId]/
          page.tsx                    -- 채팅 UI (핵심 화면)
      commits/
        page.tsx                      -- Git 커밋 타임라인
        [hash]/
          page.tsx                    -- Diff 뷰어
      settings/
        page.tsx                      -- Skills / CLAUDE.md 편집
      members/
        page.tsx                      -- 프로젝트 멤버 관리
    admin/
      users/
        page.tsx                      -- 사용자 관리 (관리자 전용)
    notifications/
      page.tsx                        -- 알림 목록 (모바일에서도 접근)
```

### 1.2 Layout Group 설계

| Layout Group | 용도 | 포함 요소 |
|---|---|---|
| `(auth)` | 로그인 등 비인증 화면 | 중앙 정렬 카드, 로고, 최소 UI |
| `(main)` | 인증 후 전체 기능 화면 | 좌측 사이드바, 헤더, 콘텐츠 영역 |

`(auth)` 레이아웃은 사이드바가 없으며, `(main)` 레이아웃은 프로젝트/폴더/세션 트리를 포함하는 사이드바를 항상 렌더링한다.

### 1.3 Server Component vs Client Component 경계

| 컴포넌트 | 유형 | 이유 |
|---|---|---|
| `app/layout.tsx` | Server | HTML 셸, 메타데이터 |
| `(main)/layout.tsx` | Client (`'use client'`) | 사이드바 상호작용, Socket.IO 연결 |
| `dashboard/page.tsx` | Server | 초기 데이터 fetch 후 Client 컴포넌트에 전달 |
| `sessions/[sessionId]/page.tsx` | Server | params 추출 + 초기 메시지 fetch |
| `ChatPanel` (하위 컴포넌트) | Client | 스트리밍, 입력, WebSocket |
| `commits/page.tsx` | Server | 커밋 목록 초기 로드 |
| `commits/[hash]/page.tsx` | Server | Diff 데이터 초기 로드 |
| `MonacoDiffViewer` | Client | 동적 임포트, 브라우저 전용 |
| `settings/page.tsx` | Client | Monaco Editor 편집 |
| `members/page.tsx` | Server | 멤버 목록 초기 로드 |
| `admin/users/page.tsx` | Server | 사용자 목록 초기 로드 |
| `notifications/page.tsx` | Client | 실시간 알림 업데이트 |

원칙: **데이터 페칭이 주 역할인 page.tsx는 Server Component**, **상호작용/브라우저 API가 필요한 하위 컴포넌트는 Client Component**로 분리한다.

---

## 2. 상태 관리 전략

### 2.1 상태 유형별 도구

| 상태 유형 | 도구 | 예시 | 이유 |
|---|---|---|---|
| 서버 상태 | TanStack Query (React Query) | 세션 목록, 메시지 히스토리, 커밋 로그, 프로젝트/폴더 목록 | 캐싱, 자동 재검증, 무한 스크롤 지원 |
| 실시간 상태 | Zustand | 세션 락 현황, 온라인 사용자 목록, 알림 | Socket.IO 이벤트로 즉시 업데이트 |
| 스트리밍 상태 | useState + useReducer | AI 응답 스트리밍 텍스트, 도구 사용 상태 | 컴포넌트 로컬에서 고빈도 업데이트 |
| UI 상태 | Zustand | 사이드바 열림/닫힘, 패널 크기, 테마 | 여러 컴포넌트에서 공유 |
| 인증 상태 | Context + httpOnly cookie | 세션 쿠키, 사용자 정보, 역할 | 보안 (XSS 방지), 서버 미들웨어 연동 |

### 2.2 Zustand 스토어 구조

```typescript
// stores/realtimeStore.ts
interface OnlineUser {
  userId: string;
  name: string;
  status: 'online' | 'offline';
  activeSessionId?: string;
}

interface RealtimeState {
  sessionLocks: Map<string, { userId: string; userName: string; lockedAt: string } | null>;
  onlineUsers: Map<string, OnlineUser>;
  notifications: Notification[];
  setSessionLock: (sessionId: string, lock: SessionLock | null) => void;
  updateOnlineUser: (userId: string, user: OnlineUser) => void;  // 단일 사용자 업데이트
  addNotification: (notification: Notification) => void;
  clearNotification: (id: string) => void;
}

interface Notification {
  id: string;
  type: string;      // snake_case: lock_request, lock_released, task_complete, mention
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  terminalPanelSize: number;
  activePanel: 'chat' | 'terminal' | 'both';
  toggleSidebar: () => void;
  setTerminalPanelSize: (size: number) => void;
  setActivePanel: (panel: 'chat' | 'terminal' | 'both') => void;
}
```

### 2.3 WebSocket 이벤트 → 스토어 매핑

WebSocket 이벤트 수신 시 Zustand 스토어 필드와 아래와 같이 매핑한다.

```typescript
// hooks/useRealtimeSync.ts
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeStore } from '@/stores/realtimeStore';

export function useRealtimeSync(socket: Socket) {
  const queryClient = useQueryClient();
  const { setSessionLock, setOnlineUsers, addNotification } = useRealtimeStore();

  useEffect(() => {
    // session:lock-updated → sessionLocks 스토어
    // lockedBy.id → userId, lockedBy.name → userName 으로 매핑
    socket.on('session:lock-updated', (data) => {
      setSessionLock(data.sessionId, data.lockedBy ? {
        userId: data.lockedBy.id,
        userName: data.lockedBy.name,
        lockedAt: data.lockedAt,
      } : null);
    });

    // user:status-changed → onlineUsers 스토어
    // 단일 사용자 객체 수신, 스토어 내 해당 사용자만 업데이트
    socket.on('user:status-changed', (data) => {
      updateOnlineUser(data.userId, {
        userId: data.userId,
        name: data.name,
        status: data.status,
        activeSessionId: data.activeSessionId,
      });
    });

    // notification:new → notifications 스토어
    socket.on('notification:new', (data) => {
      addNotification(data);
    });

    // session:lock-request → 락 보유자에게 알림 (토스트 표시)
    socket.on('session:lock-request', (data) => {
      addNotification({
        id: `lock-request-${Date.now()}`,
        type: 'lock_request',
        payload: {
          sessionId: data.sessionId,
          requestedBy: data.requestedBy,
          message: data.message,
        },
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    });

    // session:message-new → 세션 메시지 캐시 invalidation
    socket.on('session:message-new', (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', data.sessionId, 'messages'] });
    });

    // TanStack Query 캐시 invalidation
    socket.on('session:created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.folderId, 'sessions'] });
    });

    socket.on('session:archived', (data) => {
      queryClient.invalidateQueries({ queryKey: ['folders', data.folderId, 'sessions'] });
    });

    socket.on('git:commit-new', (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId, 'commits'] });
    });

    socket.on('dashboard:activity-updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', data.projectId, 'dashboard'] });
    });

    return () => {
      socket.off('session:lock-updated');
      socket.off('user:status-changed');
      socket.off('notification:new');
      socket.off('session:lock-request');
      socket.off('session:message-new');
      socket.off('session:created');
      socket.off('session:archived');
      socket.off('git:commit-new');
      socket.off('dashboard:activity-updated');
    };
  }, [socket, queryClient, setSessionLock, updateOnlineUser, addNotification]);
}
```

### 2.4 TanStack Query 키 설계

```typescript
export const queryKeys = {
  // 기본 리소스
  projects: () => ['projects'],
  project: (id: string) => ['projects', id],
  folders: (projectId: string) => ['projects', projectId, 'folders'],
  sessions: (folderId: string) => ['folders', folderId, 'sessions'],
  session: (id: string) => ['sessions', id],
  messages: (sessionId: string) => ['sessions', sessionId, 'messages'],
  commits: (projectId: string) => ['projects', projectId, 'commits'],
  commitDiff: (projectId: string, hash: string) => ['projects', projectId, 'commits', hash],
  // 파일 트리
  tree: (projectId: string) => ['projects', projectId, 'tree'],
  // 대시보드
  dashboard: {
    activity: (projectId: string) => ['projects', projectId, 'dashboard', 'activity'],
    stats: (projectId: string) => ['projects', projectId, 'dashboard', 'stats'],
    fileChanges: (projectId: string) => ['projects', projectId, 'dashboard', 'file-changes'],
    usage: (projectId: string) => ['projects', projectId, 'dashboard', 'usage'],
  },
  // Skills
  skills: {
    claudeMd: (projectId: string) => ['projects', projectId, 'skills', 'claude-md'],
    skillsMd: (projectId: string) => ['projects', projectId, 'skills', 'skills-md'],
  },
  // 멤버
  members: (projectId: string) => ['projects', projectId, 'members'],
  // 사용자 (관리자)
  users: () => ['users'],
  // 알림
  notifications: () => ['notifications'],
} as const;
```

---

## 3. SSE 스트리밍 수신 방식

### 3.1 기본 구조

App Router 환경에서 `fetch` + `ReadableStream`을 사용하여 SSE를 수신한다. EventSource API 대신 fetch를 사용하는 이유는 커스텀 헤더 전송과 POST 요청 지원이 필요하기 때문이다. 모든 요청에 `credentials: 'include'`를 포함하여 세션 쿠키를 자동 전송한다.

```typescript
// lib/sse.ts
interface SSEOptions {
  onEvent: (event: StreamEvent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}

async function streamChat(
  sessionId: string,
  message: string,
  options: SSEOptions,
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    credentials: 'include',
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`SSE 연결 실패: ${response.status}`);
  }

  await parseSSE(response, options.onEvent);
  options.onComplete();
}
```

### 3.2 SSE 파서

`event:` 라인과 `data:` 라인을 모두 파싱하여 서버가 전송하는 이벤트 타입을 정확히 수신한다. `[DONE]` 센티넬은 사용하지 않으며 `done` 이벤트로 스트림 종료를 감지한다.

```typescript
// lib/sse.ts
async function parseSSE(response: Response, onEvent: (event: StreamEvent) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onEvent({ type: currentEvent, ...data } as StreamEvent);
        currentEvent = '';
      }
    }
  }
}
```

### 3.3 스트림 이벤트 타입

```typescript
// types/stream.ts
type StreamEvent =
  | { type: 'assistant_text'; content: string }
  | { type: 'tool_use_begin'; toolId: string; tool: string }
  | { type: 'tool_use_input'; toolId: string; input: Record<string, unknown> }
  | { type: 'tool_use_end'; toolId: string }
  | { type: 'tool_result'; toolId: string; output: string; isError: boolean }
  | { type: 'system'; subtype: 'init' | 'compaction' | 'error'; message?: string }
  | { type: 'done'; messageId: string; sessionId: string; totalTokens: number };
```

### 3.4 재연결 전략

자체 구현 방식으로 지수 백오프(Exponential Backoff)를 적용한다.

```typescript
// hooks/useStreamWithRetry.ts
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function useStreamWithRetry() {
  const retryCountRef = useRef(0);

  const connect = useCallback(async (sessionId: string, message: string) => {
    try {
      await streamChat(sessionId, message, {
        onEvent: handleEvent,
        onError: handleError,
        onComplete: () => { retryCountRef.current = 0; },
      });
    } catch (error) {
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCountRef.current);
        retryCountRef.current += 1;
        setTimeout(() => connect(sessionId, message), delay);
      } else {
        // 사용자에게 재연결 실패 알림, 수동 재시도 버튼 표시
        setStreamError('연결이 끊어졌습니다. 다시 시도해주세요.');
      }
    }
  }, []);

  return { connect };
}
```

### 3.5 에러 복구 흐름

```
1. SSE 연결 끊김 감지
2. retryCount < MAX_RETRIES → 지수 백오프 후 자동 재연결
3. 재연결 성공 → retryCount 초기화, 스트리밍 계속
4. MAX_RETRIES 초과 → 에러 배너 표시 + "다시 시도" 버튼
5. 사용자가 "다시 시도" 클릭 → retryCount 초기화, 재연결 시도
6. 네트워크 자체 오류 (offline) → navigator.onLine 감지, 온라인 복귀 시 자동 재시도
```

---

## 4. 마크다운 스트리밍 렌더링

### 4.1 라이브러리 구성

| 라이브러리 | 용도 |
|---|---|
| `react-markdown` | 마크다운 → React 요소 변환 |
| `remark-gfm` | GitHub Flavored Markdown 지원 (테이블, 체크리스트 등) |
| `react-syntax-highlighter` | 코드 블록 구문 하이라이팅 |
| `rehype-raw` | HTML 태그 허용 (필요 시) |

### 4.2 스트리밍 중 렌더링 전략

```typescript
// components/chat/StreamingMessage.tsx
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingMessage({ content, isStreaming }: StreamingMessageProps) {
  return (
    <div className="prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && <span className="inline-block w-2 h-5 bg-white animate-pulse ml-1" />}
    </div>
  );
}
```

### 4.3 불완전 마크다운 처리 전략

스트리밍 중에는 마크다운 구문이 미완성 상태일 수 있다 (예: 열린 코드 블록 ` ``` `, 미완성 테이블). 다음 전략으로 처리한다.

```typescript
// lib/markdown-sanitizer.ts

/**
 * 스트리밍 중 불완전한 마크다운을 안전하게 닫아준다.
 * 완료된 메시지에는 적용하지 않는다.
 */
export function sanitizeStreamingMarkdown(text: string): string {
  let sanitized = text;

  // 열려 있는 코드 블록 닫기
  const codeBlockCount = (sanitized.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    sanitized += '\n```';
  }

  // 열려 있는 인라인 코드 닫기
  const inlineCodeCount = (sanitized.match(/(?<!`)`(?!`)/g) || []).length;
  if (inlineCodeCount % 2 !== 0) {
    sanitized += '`';
  }

  // 열려 있는 볼드/이탤릭 닫기
  const boldCount = (sanitized.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    sanitized += '**';
  }

  return sanitized;
}
```

### 4.4 완료된 메시지 메모이제이션

```typescript
// components/chat/MessageItem.tsx
import { memo } from 'react';

interface MessageItemProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming: boolean;
}

export const MessageItem = memo(function MessageItem({
  id,
  role,
  content,
  isStreaming,
}: MessageItemProps) {
  if (isStreaming) {
    return <StreamingMessage content={sanitizeStreamingMarkdown(content)} isStreaming />;
  }

  // 완료된 메시지: sanitize 불필요, memo로 리렌더 방지
  return (
    <div className="prose max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}, (prev, next) => {
  // 스트리밍 중이 아니고 content가 같으면 리렌더 건너뜀
  if (!prev.isStreaming && !next.isStreaming && prev.content === next.content) {
    return true;
  }
  return false;
});
```

---

## 5. 무거운 라이브러리 로딩 전략

모든 무거운 라이브러리는 `next/dynamic`으로 동적 임포트하며 SSR을 비활성화한다. 이를 통해 초기 번들 크기를 줄이고, 브라우저 전용 API 의존성 문제를 방지한다.

### 5.1 Monaco Editor

```typescript
// components/editor/MonacoEditor.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MonacoEditorInner = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="w-full h-[600px] rounded-lg" />
    ),
  },
);

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}

export function MonacoEditor({ value, language, onChange, readOnly }: MonacoEditorProps) {
  return (
    <MonacoEditorInner
      height="600px"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
      }}
    />
  );
}
```

### 5.2 Monaco Diff Editor

```typescript
// components/editor/MonacoDiffEditor.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DiffEditorInner = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[600px] rounded-lg" />,
  },
);

interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  language: string;
}

export function MonacoDiffEditor({ original, modified, language }: MonacoDiffEditorProps) {
  return (
    <DiffEditorInner
      height="600px"
      language={language}
      original={original}
      modified={modified}
      theme="vs-dark"
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
      }}
    />
  );
}
```

### 5.3 xterm.js

```typescript
// components/terminal/TerminalPanel.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const TerminalInner = dynamic(
  () => import('./TerminalInnerClient'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[300px] rounded-lg bg-black" />,
  },
);

export function TerminalPanel({ sessionId }: { sessionId: string }) {
  return <TerminalInner sessionId={sessionId} />;
}

// components/terminal/TerminalInnerClient.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalInnerClient({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: { background: '#0F3433', foreground: '#E8E8ED' }, // 사이드바와 동일한 Teal Dark 배경
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: false,
      disableStdin: true, // 읽기 전용
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;

    const resizeObserver = new ResizeObserver(() => fitAddon.fit());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [sessionId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

### 5.4 react-flow (Git 커밋 그래프)

```typescript
// components/git/CommitGraph.tsx
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const CommitGraphInner = dynamic(
  () => import('./CommitGraphClient'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px] rounded-lg" />,
  },
);

export function CommitGraph({ projectId }: { projectId: string }) {
  return <CommitGraphInner projectId={projectId} />;
}
```

---

## 6. UI 컴포넌트 라이브러리

### 6.1 채택: shadcn/ui

shadcn/ui를 채택한다. 이유는 다음과 같다.

- Tailwind CSS 기반으로 프로젝트 기술 스택과 일치
- 컴포넌트 코드가 프로젝트에 직접 복사되므로 커스터마이징이 자유로움
- Radix UI 기반의 접근성(a11y) 보장
- 번들 크기 최적화 (사용하는 컴포넌트만 포함)

### 6.2 사용할 핵심 컴포넌트

| 컴포넌트 | 사용처 |
|---|---|
| `Button` | 모든 버튼 (전송, 롤백, 락 요청 등) |
| `Input` / `Textarea` | 채팅 입력, 검색 |
| `Dialog` / `AlertDialog` | 롤백 확인, 락 요청 알림 |
| `DropdownMenu` | 사용자 메뉴, 세션 컨텍스트 메뉴 |
| `Tabs` | 대시보드 탭 전환 |
| `ScrollArea` | 채팅 메시지 목록, 사이드바 트리 |
| `Tooltip` | 아이콘 버튼 설명 |
| `Badge` | 세션 상태 (active, locked, archived) |
| `Skeleton` | 로딩 상태 |
| `Sheet` | 모바일 사이드바 드로어 |
| `Avatar` | 사용자 아바타 |
| `Card` | 대시보드 카드 |
| `Separator` | 구분선 |
| `Collapsible` | 사이드바 트리 접기/펼치기 |
| `ResizablePanelGroup` | 채팅 + 터미널 분할 (shadcn/ui 내장) |

### 6.3 테마 설정

`섹션 0.8 globals.css 구현` 참조. shadcn/ui의 CSS 변수 시스템을 Nexus 브랜드 컬러(Teal/Coral 그라데이션)로 커스터마이징한다. **라이트 모드를 기본**으로 사용하며, `tailwind.config.ts`에서 `darkMode: "class"`로 설정한다. 사이드바는 라이트 모드에서도 `#0F3433` 다크 Teal 배경을 유지하여 브랜드 정체성을 표현한다.

---

## 7. 패널 레이아웃

### 7.1 채팅 + 터미널 분할

`react-resizable-panels`(shadcn/ui의 `ResizablePanelGroup`에 내장)을 사용하여 채팅 영역과 터미널 영역을 수직 분할한다.

```typescript
// components/session/SessionLayout.tsx
'use client';

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { ChatPanel } from './ChatPanel';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { useUIStore } from '@/stores/uiStore';

interface SessionLayoutProps {
  sessionId: string;
  projectId: string;
}

export function SessionLayout({ sessionId, projectId }: SessionLayoutProps) {
  const { activePanel, terminalPanelSize, setTerminalPanelSize } = useUIStore();

  if (activePanel === 'chat') {
    return <ChatPanel sessionId={sessionId} />;
  }

  if (activePanel === 'terminal') {
    return <TerminalPanel sessionId={sessionId} />;
  }

  return (
    <ResizablePanelGroup direction="vertical" className="h-full">
      <ResizablePanel defaultSize={100 - terminalPanelSize} minSize={30}>
        <ChatPanel sessionId={sessionId} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={terminalPanelSize}
        minSize={15}
        collapsible
        collapsedSize={0}
        onResize={setTerminalPanelSize}
      >
        <TerminalPanel sessionId={sessionId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

### 7.2 전체 화면 구성

```
+-------------------------------------------------------------------+
|  Header (프로젝트명, 세션 제목, 락 상태, 사용자 메뉴)              |
+------------+------------------------------------------------------+
|            |                                                      |
|  Sidebar   |  Chat Panel (채팅 메시지 + 입력)                     |
|  (트리)    |                                                      |
|            +------------------------------------------------------+
|  - 프로젝트 |  [드래그 핸들]                                       |
|  - 폴더    +------------------------------------------------------+
|  - 세션    |  Terminal Panel (xterm.js)                            |
|            |                                                      |
+------------+------------------------------------------------------+
```

---

## 8. 인증 흐름

### 8.1 세션 기반 httpOnly Cookie 인증

```
1. 사용자가 로그인 페이지에서 이메일/비밀번호 입력
2. POST /api/auth/login { email, password }
3. 백엔드가 세션을 생성하고 Set-Cookie로 httpOnly, Secure, SameSite=Lax 쿠키 설정
   - connect.sid (또는 sessionId): 서버 세션 식별자
4. 이후 요청마다 쿠키가 자동 전송됨 (credentials: 'include')
5. 프론트엔드 JavaScript에서는 쿠키에 직접 접근 불가 (XSS 방지)
6. 세션 만료 시 401 응답 → 로그인 페이지로 리다이렉트
```

> **참고:** JWT 기반의 accessToken/refreshToken 갱신 로직은 사용하지 않는다. 서버 세션 방식이므로 토큰 갱신 없이 쿠키 유효 기간 동안 인증이 유지된다.

### 8.2 Next.js Middleware로 보호 라우트

쿠키 존재 여부로 보호 라우트를 체크한다.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 세션 쿠키 존재 여부 확인
  const sessionCookie = request.cookies.get('connect.sid')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 세션 유효성은 백엔드에서 검증 (미들웨어에서는 존재 여부만 확인)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### 8.3 API 클라이언트

```typescript
// lib/api.ts

/**
 * 세션 기반 인증에서는 토큰 갱신 로직이 불필요하다.
 * 모든 요청에 credentials: 'include'를 포함하여 쿠키를 자동 전송한다.
 * 401 응답 시 로그인 페이지로 리다이렉트한다.
 */
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, { ...options, credentials: 'include' });

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('인증이 만료되었습니다.');
  }

  return response;
}
```

### 8.4 인증 Context

```typescript
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  linuxUser: string;
  authMode: 'subscription' | 'api';
  role: 'admin' | 'member';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // /api/auth/me 응답의 data를 직접 사용 (data.user가 아님)
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data ?? null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',  // Set-Cookie 자동 수신
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || '로그인에 실패했습니다.');
    }

    // 로그인 성공 후 사용자 정보 재조회
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await meRes.json();
    setUser(data ?? null);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return ctx;
}
```

### 8.5 Socket.IO 인증

Socket.IO 연결 시 쿠키를 자동 전송한다. `auth.token`은 사용하지 않는다.

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
      withCredentials: true,  // 쿠키 자동 전송
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
```

---

## 9. 핵심 페이지별 컴포넌트 구조

### 9.1 채팅 페이지 (`sessions/[sessionId]/page.tsx`)

```
SessionPage (Server Component)
├── SessionHeader (Client)
│   ├── 세션 제목
│   ├── LockStatusBadge       -- 락 상태 뱃지 (본인: 초록, 타인: 주황/빨강, 미잠금: 회색)
│   ├── LockRequestButton     -- 타인 락 상태에서 "작업 요청" 버튼
│   ├── LockRequestDialog     -- 락 요청 메시지 입력 다이얼로그
│   └── UserAvatar (현재 작업자)
├── SessionLayout (Client)
│   ├── ChatPanel
│   │   ├── MessageList (ScrollArea)
│   │   │   ├── MessageItem (memo)
│   │   │   │   ├── UserMessage (사용자 메시지)
│   │   │   │   └── AssistantMessage
│   │   │   │       ├── StreamingMessage (스트리밍 중)
│   │   │   │       ├── ToolUseCard (도구 사용 표시)
│   │   │   │       │   ├── ToolHeader (도구명, 상태 아이콘)
│   │   │   │       │   ├── ToolInput (접기 가능한 입력 내용)
│   │   │   │       │   └── ToolOutput (접기 가능한 결과)
│   │   │   │       └── CompletedMessage (완료된 마크다운)
│   │   │   └── StreamingIndicator (로딩 점)
│   │   └── MessageInput
│   │       ├── Textarea (자동 높이 조절)
│   │       ├── SendButton
│   │       └── StopButton (스트리밍 중 중지)
│   ├── ResizableHandle
│   └── TerminalPanel
│       └── TerminalInnerClient (xterm.js)
```

팀 질의는 세션을 생성하지 않고, 대시보드의 `TeamQueryInput` 컴포넌트에서 직접 `POST /api/projects/:id/query`를 호출한다. 일회성 SSE 스트리밍으로 응답을 받아 표시하며, 히스토리를 DB에 저장하지 않는다. 코딩 세션과 팀 질의는 완전히 별개의 흐름이다.

### 9.2 대시보드 (`dashboard/page.tsx`)

대시보드는 `/dashboard` 라우트이지만 API가 `projectId`를 필요로 한다. 페이지 상단에 프로젝트 선택 드롭다운을 배치하고, 선택된 `projectId`를 URL query parameter(`?projectId=xxx`)로 관리한다. 기본값은 사용자가 마지막으로 작업한 프로젝트이며, 이 값은 Zustand 스토어에도 저장한다.

```
DashboardPage (Server Component)
├── DashboardHeader
│   ├── ProjectSelectDropdown (프로젝트 선택, URL query parameter 연동)
│   └── 기간 필터
├── TeamQueryInput (Client)             -- 팀 질의 패널 (구 PMQueryInput)
│   └── "프로젝트에 질문하기" 입력창 (팀 질의 — 일회성 SSE)
├── ActivitySection (Client)
│   ├── ActivityCards (현재 작업 중인 세션 카드들)
│   │   └── ActivityCard
│   │       ├── UserAvatar
│   │       ├── 세션명
│   │       ├── 경과 시간
│   │       └── 상태 Badge
│   └── OnlineUserList
├── CommitTimelineSection (Client)
│   ├── CommitGraph (react-flow, 세션별 색 구분)
│   └── CommitList
│       └── CommitItem (해시, 메시지, 작성자, 시간, additions/deletions)
├── FileChangeMapSection (Client)
│   ├── FileChangeMap (파일별 변경 빈도 히트맵)
│   └── 변경 파일 목록 테이블
└── UsageChartSection (Client)
    └── UsageTable (팀원별 사용 현황 테이블 — 시간, 비용, 메시지 수)
```

### 9.3 Diff 뷰어 (`commits/[hash]/page.tsx`)

```
DiffPage (Server Component)
├── DiffHeader
│   ├── 커밋 해시, 메시지, 작성자
│   ├── 총 additions/deletions 통계 (+N / -N)
│   ├── 부모 커밋 링크
│   └── RevertButton (원클릭 롤백 — AlertDialog 확인)
├── ChangedFileList
│   └── FileItem (파일 경로, 추가/삭제 줄 수, 상태: added/modified/deleted)
└── DiffViewerPanel (Client)
    └── MonacoDiffEditor (Monaco Diff Editor, dynamic import, SSR 비활성화)
```

### 9.4 Skills / CLAUDE.md 에디터 (`settings/page.tsx`)

```
SettingsPage (Client Component)
├── SettingsTabs
│   ├── Tab: CLAUDE.md
│   │   └── MonacoEditor (language: "markdown")
│   └── Tab: skills.md
│       └── MonacoEditor (language: "markdown")
├── SaveButton
└── LastSavedInfo (마지막 저장 시간, 저장한 사용자)
```

### 9.5 프로젝트 멤버 관리 (`members/page.tsx`)

```
MembersPage (Server Component)
├── MembersHeader
│   ├── 프로젝트명
│   └── InviteMemberButton
├── MemberList (Client)
│   └── MemberItem
│       ├── UserAvatar
│       ├── 이름, 이메일
│       ├── RoleBadge (admin | member)
│       └── RemoveMemberButton
└── InviteMemberDialog
    ├── 사용자 검색 Input
    └── 역할 선택 Dropdown
```

### 9.6 사용자 관리 (`admin/users/page.tsx`)

```
UsersPage (Server Component, 관리자 전용)
├── UsersHeader
│   └── CreateUserButton
├── UserTable (Client)
│   └── UserRow
│       ├── 이름, 이메일, linuxUser
│       ├── RoleBadge
│       ├── 상태 (활성/비활성)
│       └── EditButton / DeleteButton
└── CreateUserDialog
    ├── 이름, 이메일, 비밀번호 입력
    └── 역할 선택 Dropdown
```

### 9.7 알림 컴포넌트

#### 헤더 내 알림 UI

```
(main)/layout.tsx 헤더 영역
└── NotificationBell (Client)           -- 벨 아이콘 + 미읽음 카운트 뱃지
    └── NotificationDropdown            -- 클릭 시 드롭다운 (최근 알림 목록)
        └── NotificationItem            -- 개별 알림 항목
            ├── 알림 아이콘 (type별 구분)
            ├── 알림 내용 (payload 기반 렌더링)
            ├── 시간 (createdAt)
            └── ReadStatusIndicator (isRead)
```

#### 알림 목록 페이지 (`notifications/page.tsx`)

```
NotificationsPage (Client Component)
├── NotificationsHeader
│   └── MarkAllReadButton
├── NotificationList
│   └── NotificationItem
│       ├── 알림 아이콘 (type별: lock_request, lock_released, task_complete, mention)
│       ├── 알림 내용 (payload 기반 렌더링)
│       ├── 시간 (createdAt)
│       └── ReadStatusIndicator (isRead)
└── EmptyState (알림이 없을 때)
```

---

## 10. 반응형 전략

### 10.1 브레이크포인트

| 브레이크포인트 | 범위 | 대상 |
|---|---|---|
| `sm` | 640px 이상 | 큰 모바일 |
| `md` | 768px 이상 | 태블릿 |
| `lg` | 1024px 이상 | 소형 데스크탑 |
| `xl` | 1280px 이상 | 데스크탑 |

### 10.2 PC (lg 이상): 풀 기능

- 사이드바 항상 표시 (접기 가능)
- 채팅 + 터미널 분할 패널
- Monaco Editor Diff 뷰어 (side-by-side)
- 대시보드 그리드 레이아웃 (2~3 컬럼)

### 10.3 모바일 (lg 미만): 모니터링 중심

- 사이드바를 `Sheet`(드로어)로 전환, 기본 숨김
- 터미널 패널 기본 숨김, 토글로 전환
- Diff 뷰어를 inline 모드로 전환 (side-by-side 비활성)
- 대시보드 단일 컬럼
- 채팅 입력 간소화 (고정 높이)
- 알림 목록 페이지(`/notifications`) 접근 가능 (하단 네비게이션 또는 헤더 아이콘)

### 10.4 반응형 구현 예시

```typescript
// components/layout/MainLayout.tsx
'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="flex h-screen">
      {isDesktop ? (
        <aside className="w-64 border-r shrink-0">
          <Sidebar />
        </aside>
      ) : (
        <Sheet>
          <SheetTrigger asChild>
            <button className="fixed top-4 left-4 z-50 lg:hidden">
              <MenuIcon />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      )}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

```typescript
// hooks/useMediaQuery.ts
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

---

## 부록: 주요 npm 패키지 목록

| 패키지 | 버전 기준 | 용도 |
|---|---|---|
| `next` | 14+ | 프레임워크 |
| `react` / `react-dom` | 18+ | UI 라이브러리 |
| `typescript` | 5+ | 타입 시스템 |
| `tailwindcss` | 3+ | 스타일링 |
| `@tanstack/react-query` | 5+ | 서버 상태 관리 |
| `zustand` | 4+ | 클라이언트 상태 관리 |
| `socket.io-client` | 4+ | 실시간 통신 |
| `@monaco-editor/react` | 4+ | 코드/Diff 에디터 |
| `@xterm/xterm` | 5+ | 터미널 렌더링 |
| `@xterm/addon-fit` | 0.10+ | 터미널 크기 자동 조절 |
| `@xyflow/react` (react-flow) | 12+ | Git 그래프 시각화 |
| `react-markdown` | 9+ | 마크다운 렌더링 |
| `remark-gfm` | 4+ | GFM 지원 |
| `react-syntax-highlighter` | 15+ | 코드 하이라이팅 |
| `react-resizable-panels` | 2+ | 패널 분할 |
| `class-variance-authority` | - | shadcn/ui 의존 |
| `clsx` / `tailwind-merge` | - | 클래스 유틸리티 |
| `lucide-react` | - | 아이콘 |
