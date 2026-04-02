# Nexus API 명세서

> 최종 수정: 2026-04-02

## 공통 규칙

### URL 규칙
- Base URL: `/api`
- 경로: kebab-case (예: `/api/session-lock`)
- JSON 프로퍼티: camelCase

### 인증
- 인증 방식: httpOnly cookie 기반 세션 인증
- 모든 요청에 `credentials: 'include'`로 쿠키 자동 전송
- 세션 만료 시 `401 Unauthorized` 반환

### 에러 응답 형식
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "유효하지 않은 세션입니다."
  }
}
```

### 공통 에러 코드
| HTTP 상태 | code | 설명 |
|-----------|------|------|
| 400 | `BAD_REQUEST` | 요청 파라미터 오류 |
| 401 | `UNAUTHORIZED` | 인증 실패 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 충돌 (예: 세션 락) |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

### 페이지네이션
목록 API는 쿼리 파라미터로 페이지네이션을 지원한다.

**요청 파라미터:**
| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `page` | number | 1 | 페이지 번호 (1부터 시작) |
| `limit` | number | 20 | 페이지당 항목 수 (최대 100) |

**응답 형식:**
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 1. Auth (인증)

### 1.1 POST /api/auth/login
로그인하여 세션 쿠키를 발급받는다.

- **인증 필요:** 아니오

**요청:**
```json
{
  "email": "hong@example.com",
  "password": "password123"
}
```

**응답 (200):**

서버가 `Set-Cookie` 헤더로 httpOnly 세션 쿠키를 설정한다.

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동",
    "email": "hong@example.com",
    "role": "member"
  }
}
```

### 1.2 POST /api/auth/logout
로그아웃하여 서버 세션을 삭제하고 쿠키를 제거한다.

- **인증 필요:** 예

**요청:** body 없음

**응답 (200):**

서버가 세션을 삭제하고 `Set-Cookie` 헤더로 쿠키를 만료시킨다.

```json
{
  "message": "로그아웃 되었습니다."
}
```

### 1.3 GET /api/auth/me
현재 로그인한 사용자 정보를 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동",
  "email": "hong@example.com",
  "role": "member",
  "linuxUser": "hong",
  "authMode": "subscription",
  "phone": "01012345678",
  "notifySms": false,
  "notifyBrowser": true,
  "notifySound": true
}
```

### 1.4 PATCH /api/auth/settings
현재 로그인한 사용자의 알림 설정을 부분 업데이트한다.
변경할 필드만 body에 포함하면 되며, 포함되지 않은 필드는 그대로 유지된다.

- **인증 필요:** 예

**요청:**
```json
{
  "phone": "01012345678",
  "notifySms": true,
  "notifyBrowser": true,
  "notifySound": false
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `phone` | `string \| null` | 아니오 | 수신 전화번호 (null 전달 시 삭제, 최대 20자) |
| `notifySms` | `boolean` | 아니오 | SMS 알림 활성화 여부 |
| `notifyBrowser` | `boolean` | 아니오 | 브라우저 푸시 알림 활성화 여부 |
| `notifySound` | `boolean` | 아니오 | 알림음 활성화 여부 |

> **제약:** 변경할 필드가 하나도 없으면 `400 BAD_REQUEST` 반환.

**응답 (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "01012345678",
  "notifySms": true,
  "notifyBrowser": true,
  "notifySound": false
}
```

**에러 응답:**
| HTTP 상태 | code | 설명 |
|-----------|------|------|
| 400 | `BAD_REQUEST` | 변경할 필드가 없거나 유효하지 않은 값 |
| 401 | `UNAUTHORIZED` | 인증되지 않은 요청 |

---

## 2. Users (사용자 관리 - 관리자 전용)

### 2.1 GET /api/users
사용자 목록을 조회한다.

- **인증 필요:** 예 (관리자)

**쿼리 파라미터:** `page`, `limit`

**응답 (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "email": "hong@example.com",
      "role": "member",
      "linuxUser": "hong",
      "authMode": "subscription",
      "claudeAccount": "hong-claude",
      "createdAt": "2026-03-01T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 6, "totalPages": 1 }
}
```

### 2.2 POST /api/users
새 사용자를 추가한다.

- **인증 필요:** 예 (관리자)

**요청:**
```json
{
  "name": "김철수",
  "email": "kim@example.com",
  "password": "password123",
  "role": "member",
  "linuxUser": "kim",
  "authMode": "subscription"
}
```

**응답 (201):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "김철수",
  "email": "kim@example.com",
  "role": "member",
  "linuxUser": "kim",
  "authMode": "subscription",
  "createdAt": "2026-04-01T09:00:00.000Z"
}
```

### 2.3 GET /api/users/:id
특정 사용자 정보를 조회한다.

- **인증 필요:** 예 (관리자)

**응답 (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동",
  "email": "hong@example.com",
  "role": "member",
  "linuxUser": "hong",
  "authMode": "subscription",
  "createdAt": "2026-03-01T09:00:00.000Z"
}
```

### 2.4 PATCH /api/users/:id
사용자 정보를 수정한다.

- **인증 필요:** 예 (관리자)

**요청:**
```json
{
  "role": "admin",
  "authMode": "api"
}
```

**응답 (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "홍길동",
  "email": "hong@example.com",
  "role": "admin",
  "linuxUser": "hong",
  "authMode": "api",
  "createdAt": "2026-03-01T09:00:00.000Z"
}
```

### 2.5 DELETE /api/users/:id
사용자를 삭제한다.

- **인증 필요:** 예 (관리자)

**응답 (200):**
```json
{
  "message": "사용자가 삭제되었습니다."
}
```

---

## 3. Projects (프로젝트)

### 3.1 GET /api/projects
프로젝트 목록을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:** `page`, `limit`

**응답 (200):**
```json
{
  "data": [
    {
      "id": "aaa-bbb-ccc",
      "name": "쇼핑몰",
      "repoPath": "/home/ubuntu/projects/shopping-mall/",
      "description": "팀 쇼핑몰 프로젝트",
      "createdAt": "2026-03-01T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

### 3.2 POST /api/projects
새 프로젝트를 생성한다.

- **인증 필요:** 예

**요청:**
```json
{
  "name": "쇼핑몰",
  "repoPath": "/home/ubuntu/projects/shopping-mall/",
  "description": "팀 쇼핑몰 프로젝트"
}
```

**응답 (201):**
```json
{
  "id": "aaa-bbb-ccc",
  "name": "쇼핑몰",
  "repoPath": "/home/ubuntu/projects/shopping-mall/",
  "description": "팀 쇼핑몰 프로젝트",
  "createdAt": "2026-03-01T09:00:00.000Z"
}
```

### 3.3 GET /api/projects/:id
특정 프로젝트를 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "id": "aaa-bbb-ccc",
  "name": "쇼핑몰",
  "repoPath": "/home/ubuntu/projects/shopping-mall/",
  "description": "팀 쇼핑몰 프로젝트",
  "createdAt": "2026-03-01T09:00:00.000Z"
}
```

### 3.4 PATCH /api/projects/:id
프로젝트 정보를 수정한다.

- **인증 필요:** 예

**요청:**
```json
{
  "name": "쇼핑몰 v2",
  "description": "리뉴얼된 쇼핑몰 프로젝트"
}
```

**응답 (200):**
```json
{
  "id": "aaa-bbb-ccc",
  "name": "쇼핑몰 v2",
  "repoPath": "/home/ubuntu/projects/shopping-mall/",
  "description": "리뉴얼된 쇼핑몰 프로젝트",
  "createdAt": "2026-03-01T09:00:00.000Z"
}
```

### 3.5 DELETE /api/projects/:id
프로젝트를 삭제한다.

- **인증 필요:** 예 (관리자)

**응답 (200):**
```json
{
  "message": "프로젝트가 삭제되었습니다."
}
```

> **주의:** 프로젝트 삭제 시 하위 폴더, 세션, 메시지가 모두 삭제된다. 실제 Git 레포지토리 디렉토리는 삭제하지 않는다.

---

## 4. Project Members (프로젝트 멤버 관리)

### 4.1 GET /api/projects/:id/members
프로젝트 멤버 목록을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:** `page`, `limit`

**응답 (200):**
```json
{
  "data": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "email": "hong@example.com",
      "role": "admin",
      "joinedAt": "2026-03-01T09:00:00.000Z"
    },
    {
      "userId": "660e8400-e29b-41d4-a716-446655440001",
      "name": "김철수",
      "email": "kim@example.com",
      "role": "member",
      "joinedAt": "2026-03-05T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

### 4.2 POST /api/projects/:id/members
프로젝트에 멤버를 추가한다.

- **인증 필요:** 예

**요청:**
```json
{
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "role": "member"
}
```

**응답 (201):**
```json
{
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "name": "김철수",
  "email": "kim@example.com",
  "role": "member",
  "joinedAt": "2026-03-05T09:00:00.000Z"
}
```

### 4.3 PATCH /api/projects/:id/members/:userId
프로젝트 멤버의 역할을 변경한다.

- **인증 필요:** 예

**요청:**
```json
{
  "role": "admin"
}
```

**응답 (200):**
```json
{
  "userId": "660e8400-e29b-41d4-a716-446655440001",
  "name": "김철수",
  "email": "kim@example.com",
  "role": "admin",
  "joinedAt": "2026-03-05T09:00:00.000Z"
}
```

### 4.4 DELETE /api/projects/:id/members/:userId
프로젝트에서 멤버를 제거한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "message": "멤버가 제거되었습니다."
}
```

---

## 5. Folders (폴더 - 프로젝트 하위)

### 5.1 GET /api/projects/:projectId/folders
프로젝트 하위 폴더 목록을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:** `page`, `limit`

**응답 (200):**
```json
{
  "data": [
    {
      "id": "ddd-eee-fff",
      "projectId": "aaa-bbb-ccc",
      "name": "인증",
      "description": "인증 관련 모듈",
      "createdAt": "2026-03-05T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

### 5.2 POST /api/projects/:projectId/folders
폴더를 생성한다.

- **인증 필요:** 예

**요청:**
```json
{
  "name": "인증",
  "description": "인증 관련 모듈"
}
```

**응답 (201):**
```json
{
  "id": "ddd-eee-fff",
  "projectId": "aaa-bbb-ccc",
  "name": "인증",
  "description": "인증 관련 모듈",
  "createdAt": "2026-03-05T09:00:00.000Z"
}
```

### 5.3 GET /api/projects/:projectId/folders/:id
특정 폴더를 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "id": "ddd-eee-fff",
  "projectId": "aaa-bbb-ccc",
  "name": "인증",
  "description": "인증 관련 모듈",
  "createdAt": "2026-03-05T09:00:00.000Z"
}
```

### 5.4 PATCH /api/projects/:projectId/folders/:id
폴더 정보를 수정한다.

- **인증 필요:** 예

**요청:**
```json
{
  "name": "인증/보안",
  "description": "인증 및 보안 관련 모듈"
}
```

**응답 (200):**
```json
{
  "id": "ddd-eee-fff",
  "projectId": "aaa-bbb-ccc",
  "name": "인증/보안",
  "description": "인증 및 보안 관련 모듈",
  "createdAt": "2026-03-05T09:00:00.000Z"
}
```

### 5.5 DELETE /api/projects/:projectId/folders/:id
폴더를 삭제한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "message": "폴더가 삭제되었습니다."
}
```

> **주의:** 폴더 삭제 시 하위 세션과 메시지가 모두 삭제된다.

---

## 6. Sessions (세션)

### 6.1 GET /api/sessions
세션 목록을 조회한다. 폴더별 필터링 가능.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `folderId` | string | 예 | 폴더 ID |
| `status` | string | 아니오 | `active` / `archived` (기본: 전체) |
| `page` | number | 아니오 | 페이지 번호 |
| `limit` | number | 아니오 | 페이지당 항목 수 |

**응답 (200):**
```json
{
  "data": [
    {
      "id": "ggg-hhh-iii",
      "folderId": "ddd-eee-fff",
      "claudeSessionId": "abc123-session",
      "title": "로그인 API 구현",
      "status": "active",
      "lockedBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "홍길동"
      },
      "lockedAt": "2026-04-01T10:00:00.000Z",
      "createdBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "홍길동"
      },
      "worktreePath": "/home/ubuntu/projects-wt/shopping-mall/ggg-hhh-iii/",
      "branchName": "session/ggg-hhh-iii",
      "mergeStatus": "working",
      "lastActivityAt": "2026-04-01T10:30:00.000Z",
      "createdAt": "2026-04-01T09:00:00.000Z",
      "updatedAt": "2026-04-01T10:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### 6.2 POST /api/sessions
새 세션을 생성한다.

- **인증 필요:** 예

**요청:**
```json
{
  "folderId": "ddd-eee-fff",
  "title": "로그인 API 구현"
}
```

**응답 (201):**
```json
{
  "id": "ggg-hhh-iii",
  "folderId": "ddd-eee-fff",
  "claudeSessionId": null,
  "title": "로그인 API 구현",
  "status": "active",
  "lockedBy": null,
  "lockedAt": null,
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  },
  "worktreePath": "/home/ubuntu/projects-wt/shopping-mall/ggg-hhh-iii/",
  "branchName": "session/ggg-hhh-iii",
  "mergeStatus": "working",
  "lastActivityAt": "2026-04-01T09:00:00.000Z",
  "createdAt": "2026-04-01T09:00:00.000Z",
  "updatedAt": "2026-04-01T09:00:00.000Z"
}
```

> **Worktree 동작:**
> - 세션 생성 시 내부적으로 `git worktree add`로 독립 작업 디렉토리와 브랜치를 생성한다.
> - `worktreePath`와 `branchName`이 DB에 저장된다.
> - `claudeSessionId`는 첫 채팅 메시지 전송 시 Claude Code CLI 실행 후 할당된다.

### 6.3 GET /api/sessions/:id
특정 세션을 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "id": "ggg-hhh-iii",
  "folderId": "ddd-eee-fff",
  "claudeSessionId": "abc123-session",
  "title": "로그인 API 구현",
  "status": "active",
  "lockedBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  },
  "lockedAt": "2026-04-01T10:00:00.000Z",
  "createdBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  },
  "worktreePath": "/home/ubuntu/projects-wt/shopping-mall/ggg-hhh-iii/",
  "branchName": "session/ggg-hhh-iii",
  "mergeStatus": "working",
  "lastActivityAt": "2026-04-01T10:30:00.000Z",
  "createdAt": "2026-04-01T09:00:00.000Z",
  "updatedAt": "2026-04-01T10:30:00.000Z"
}
```

### 6.4 PATCH /api/sessions/:id
세션 정보를 수정한다 (제목, 상태 변경 등).

- **인증 필요:** 예

**요청:**
```json
{
  "title": "로그인 + 회원가입 API 구현",
  "status": "archived"
}
```

**응답 (200):**
```json
{
  "id": "ggg-hhh-iii",
  "folderId": "ddd-eee-fff",
  "title": "로그인 + 회원가입 API 구현",
  "status": "archived",
  "mergeStatus": "merged",
  "updatedAt": "2026-04-01T11:00:00.000Z"
}
```

> **Worktree 아카이브 동작:**
> - `status`를 `archived`로 변경하면 내부적으로 다음이 실행된다:
>   1. worktree 브랜치를 main에 merge (충돌 시 AI 자동 해결)
>   2. `git worktree remove`로 작업 디렉토리 정리
>   3. `mergeStatus`가 `merged` 또는 `conflict`로 업데이트
> - merge 실패 시 `mergeStatus: "conflict"`로 설정되며, 수동 merge API를 통해 재시도 가능

### 6.5 DELETE /api/sessions/:id
세션을 삭제한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "message": "세션이 삭제되었습니다."
}
```

### 6.6 POST /api/sessions/:id/lock
세션 락을 획득한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "sessionId": "ggg-hhh-iii",
  "lockedBy": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  },
  "lockedAt": "2026-04-01T10:00:00.000Z"
}
```

**에러 (409):** 다른 사용자가 이미 락을 보유 중일 때
```json
{
  "error": {
    "code": "SESSION_LOCKED",
    "message": "현재 김철수 님이 작업 중입니다."
  }
}
```

> **특이사항:** 무입력 시 자동 해제 (서버 측 setInterval로 `last_activity_at` 주기적 체크, 1분 간격). 락 상태 변경은 WebSocket `session:lock-updated`로 브로드캐스트된다.

### 6.7 POST /api/sessions/:id/unlock
세션 락을 해제한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "sessionId": "ggg-hhh-iii",
  "lockedBy": null,
  "lockedAt": null
}
```

> **특이사항:** 본인이 보유한 락만 해제 가능. 관리자는 강제 해제 가능.

### 6.8 POST /api/sessions/:id/lock-request
다른 사용자가 보유한 락을 요청한다. 현재 락 보유자에게 실시간 알림이 전송된다.

- **인증 필요:** 예

**요청:**
```json
{
  "message": "급한 버그 수정이 필요합니다."
}
```

**응답 (200):**
```json
{
  "message": "락 요청이 전송되었습니다.",
  "requestedTo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  }
}
```

> **특이사항:** WebSocket `session:lock-request` 이벤트로 락 보유자에게 알림. `notification:new`로도 전달.

### 6.9 POST /api/sessions/:id/merge
세션의 worktree 브랜치를 main에 수동으로 merge한다. 자동 merge 실패(`mergeStatus: "conflict"`) 시 사용.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "sessionId": "ggg-hhh-iii",
  "mergeStatus": "merged",
  "mergeCommitHash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "message": "브랜치가 main에 성공적으로 merge되었습니다."
}
```

**에러 (409):** merge 충돌이 여전히 해결되지 않을 때
```json
{
  "error": {
    "code": "MERGE_CONFLICT",
    "message": "merge 충돌이 발생했습니다. AI 자동 해결을 시도합니다."
  }
}
```

> **특이사항:** merge 시 충돌이 발생하면 AI가 자동으로 충돌 해결을 시도한다. 해결 성공 시 `mergeStatus`가 `merged`로 업데이트된다.

---

## 7. Chat (채팅 - SSE 스트리밍)

### 7.1 POST /api/sessions/:id/chat
세션에 메시지를 전송하고 AI 응답을 SSE 스트리밍으로 받는다.

- **인증 필요:** 예
- **응답 형식:** `text/event-stream` (SSE)

**요청:**
```json
{
  "message": "로그인 API를 Express로 구현해줘"
}
```

**SSE 응답 스트림:**

전송 형식: `event: {type}\ndata: {json}\n\n`

```
event: system
data: {"subtype": "init", "message": "세션을 초기화합니다."}

event: assistant_text
data: {"content": "로그인 API를 구현하겠습니다."}

event: tool_use_begin
data: {"toolId": "tool-001", "tool": "Write"}

event: tool_use_input
data: {"toolId": "tool-001", "input": {"filePath": "src/auth/login.ts", "content": "..."}}

event: tool_use_end
data: {"toolId": "tool-001"}

event: tool_result
data: {"toolId": "tool-001", "output": "파일이 생성되었습니다.", "isError": false}

event: assistant_text
data: {"content": "파일을 생성했습니다. 이제 테스트를 실행합니다."}

event: done
data: {"messageId": "msg-001", "sessionId": "ggg-hhh-iii", "totalTokens": 1500}

```

스트림 종료: `done` 이벤트 수신 시 완료.

> **특이사항:**
> - 채팅 요청 시 세션 락이 자동으로 획득/갱신된다 (별도 lock API 호출 불필요).
> - 채팅 시 `lastActivityAt`이 자동 갱신된다.
> - `claudeSessionId`가 없는 세션의 첫 요청 시 새 Claude Code 세션이 생성되고, 이후 요청은 `--resume`으로 이어간다.
> - 응답 완료 후 git log diff로 새 커밋을 감지하여 DB에 동기화한다.
> - 메시지(사용자 입력 + AI 응답)는 DB에 저장된다.

### 7.2 POST /api/sessions/:id/abort
현재 진행 중인 AI 응답을 중단한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "message": "작업이 중단되었습니다.",
  "sessionId": "ggg-hhh-iii",
  "partialResultSaved": true
}
```

> **특이사항:**
> - 내부적으로 Claude Code CLI 프로세스에 SIGTERM을 전송한다.
> - 세션 락은 유지된다 (중단해도 다른 사용자에게 넘어가지 않음).
> - 중단 시점까지의 부분 결과는 DB에 저장된다.

### 7.3 GET /api/sessions/:id/messages
세션의 메시지 히스토리를 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:** `page`, `limit`

**응답 (200):**
```json
{
  "data": [
    {
      "id": "msg-001",
      "sessionId": "ggg-hhh-iii",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "type": "text",
      "content": "로그인 API를 Express로 구현해줘",
      "metadata": null,
      "tokenCount": null,
      "createdAt": "2026-04-01T10:00:00.000Z"
    },
    {
      "id": "msg-002",
      "sessionId": "ggg-hhh-iii",
      "userId": null,
      "role": "assistant",
      "type": "text",
      "content": "로그인 API를 구현하겠습니다. ...",
      "metadata": {
        "toolsUsed": ["Write", "Read"],
        "filesChanged": ["src/auth/login.ts"]
      },
      "tokenCount": 1500,
      "createdAt": "2026-04-01T10:00:05.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 24, "totalPages": 2 }
}
```

---

## 8. Notifications (알림)

### 8.1 GET /api/notifications
내 알림 목록을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `isRead` | boolean | 아니오 | 읽음 여부 필터 (`true` / `false`) |
| `page` | number | 아니오 | 페이지 번호 |
| `limit` | number | 아니오 | 페이지당 항목 수 |

**응답 (200):**
```json
{
  "data": [
    {
      "id": "notif-001",
      "type": "lock_request",
      "payload": {
        "title": "락 요청",
        "message": "김철수 님이 '로그인 API 구현' 세션의 락을 요청했습니다.",
        "sessionId": "ggg-hhh-iii",
        "requestedBy": { "id": "660e...", "name": "김철수" }
      },
      "isRead": false,
      "createdAt": "2026-04-01T10:15:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### 8.2 PATCH /api/notifications/:id
알림을 읽음 처리한다.

- **인증 필요:** 예

**요청:**
```json
{
  "isRead": true
}
```

**응답 (200):**
```json
{
  "id": "notif-001",
  "isRead": true
}
```

### 8.3 PATCH /api/notifications/read-all
모든 알림을 읽음 처리한다.

- **인증 필요:** 예

**요청:** body 없음

**응답 (200):**
```json
{
  "message": "모든 알림이 읽음 처리되었습니다.",
  "updatedCount": 5
}
```

### 8.4 DELETE /api/notifications/:id
알림을 삭제한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "message": "알림이 삭제되었습니다."
}
```

---

## 9. Team Query (팀 질의 - SSE 스트리밍)

> 이전 명칭 "PM Query"에서 "팀 질의"로 변경. 팀원 누구나 프로젝트/폴더 단위로 질의 가능하다.

### 9.1 POST /api/projects/:id/query
프로젝트 단위로 현황을 자연어로 질의한다. 세션 히스토리 + Git 로그를 종합하여 AI가 답변한다.

- **인증 필요:** 예
- **응답 형식:** `text/event-stream` (SSE)

**요청:**
```json
{
  "message": "이번 주 변경된 파일 목록 알려줘"
}
```

**SSE 응답 스트림:**
```
event: system
data: {"subtype": "init", "message": "프로젝트 현황을 조회합니다."}

event: assistant_text
data: {"content": "이번 주 변경된 파일 목록을 조회하겠습니다."}

event: assistant_text
data: {"content": "- src/auth/login.ts (3회 수정)\n- src/auth/register.ts (신규)"}

event: done
data: {"messageId": "pm-msg-001", "sessionId": null, "totalTokens": 800}

```

> **특이사항:**
> - 내부적으로 Claude Code를 읽기 전용 모드(`--allowedTools "Read,Glob,Grep"`)로 실행한다.
> - 세션 락이 필요하지 않다 (읽기 전용).
> - 폴더 단위 세션 요약 + Git 로그를 컨텍스트로 수집하여 프롬프트에 포함한다.
> - PM 질의 히스토리는 저장하지 않는다 (읽기 전용, 일회성).
> - 컨텍스트 수집 제한: 최근 세션 10개 요약 + 최근 커밋 50개.
> - 동시 PM 질의 제한: 프로젝트당 최대 2개.

### 9.2 POST /api/projects/:id/folders/:folderId/query
폴더 단위로 현황을 자연어로 질의한다.

- **인증 필요:** 예
- **응답 형식:** `text/event-stream` (SSE)

**요청:**
```json
{
  "message": "인증 모듈 어디까지 진행됐어?"
}
```

**SSE 응답 스트림:** 9.1과 동일한 형식.

> **특이사항:** 해당 폴더의 세션 히스토리만 컨텍스트로 수집하므로 더 정확한 답변이 가능하다.

---

## 10. Git (커밋 로그, Diff, Revert)

### 10.1 GET /api/projects/:id/commits
프로젝트의 커밋 로그를 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `sessionId` | string | 아니오 | 특정 세션의 커밋만 필터링 |
| `author` | string | 아니오 | 작성자 필터 |
| `since` | string | 아니오 | 시작일 (ISO 8601) |
| `until` | string | 아니오 | 종료일 (ISO 8601) |
| `page` | number | 아니오 | 페이지 번호 |
| `limit` | number | 아니오 | 페이지당 항목 수 |

**응답 (200):**
```json
{
  "data": [
    {
      "id": "commit-001",
      "sessionId": "ggg-hhh-iii",
      "projectId": "aaa-bbb-ccc",
      "hash": "a1b2c3d4e5f6789012345678901234567890abcd",
      "message": "[로그인 API 구현] JWT 인증 로직 추가 - 홍길동",
      "author": "홍길동",
      "filesChanged": ["src/auth/login.ts", "src/auth/middleware.ts"],
      "additions": 45,
      "deletions": 3,
      "triggeredBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "홍길동"
      },
      "createdAt": "2026-04-01T10:30:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

### 10.2 GET /api/projects/:id/commits/:hash/diff
특정 커밋의 Diff를 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "hash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "message": "[로그인 API 구현] JWT 인증 로직 추가 - 홍길동",
  "author": "홍길동",
  "date": "2026-04-01T10:30:00.000Z",
  "files": [
    {
      "path": "src/auth/login.ts",
      "status": "added",
      "additions": 45,
      "deletions": 0,
      "diff": "--- /dev/null\n+++ b/src/auth/login.ts\n@@ -0,0 +1,45 @@\n+import ..."
    }
  ],
  "stats": {
    "totalAdditions": 45,
    "totalDeletions": 0,
    "filesChanged": 1
  }
}
```

### 10.3 POST /api/projects/:id/commits/:hash/revert
특정 커밋을 Revert한다. `git revert`를 실행하여 새 Revert 커밋을 생성한다.

- **인증 필요:** 예

**요청:**
```json
{
  "message": "버그가 있어서 롤백합니다."
}
```

**응답 (200):**
```json
{
  "revertCommitHash": "f9e8d7c6b5a4321098765432109876543210fedc",
  "message": "Revert \"[로그인 API 구현] JWT 인증 로직 추가 - 홍길동\"",
  "revertedHash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "sessionId": null
}
```

**경고 응답 (200):** 해당 프로젝트에 활성 세션(`locked_by != null`)이 있을 때
```json
{
  "warning": "현재 활성 세션이 존재합니다. revert 시 충돌이 발생할 수 있습니다.",
  "activeSessions": [
    {
      "sessionId": "ggg-hhh-iii",
      "title": "로그인 API 구현",
      "lockedBy": { "id": "550e...", "name": "홍길동" }
    }
  ],
  "revertCommitHash": "f9e8d7c6b5a4321098765432109876543210fedc",
  "message": "Revert \"[로그인 API 구현] JWT 인증 로직 추가 - 홍길동\"",
  "revertedHash": "a1b2c3d4e5f6789012345678901234567890abcd",
  "sessionId": null
}
```

**에러 (409):** revert 충돌이 발생했을 때
```json
{
  "error": {
    "code": "REVERT_CONFLICT",
    "message": "revert 중 충돌이 발생하여 자동으로 abort했습니다. 수동 해결이 필요합니다."
  }
}
```

> **특이사항:**
> - Revert 후 새 커밋이 DB에 자동 동기화된다. 대시보드에 실시간 반영.
> - revert 커밋의 `sessionId`는 `null`로 저장된다.
> - revert conflict 발생 시 자동으로 `git revert --abort`를 실행하고 에러를 반환한다.

---

## 11. Dashboard (대시보드)

### 11.1 GET /api/projects/:id/dashboard/activity
프로젝트의 현재 작업 현황을 조회한다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "activeSessions": [
    {
      "sessionId": "ggg-hhh-iii",
      "title": "로그인 API 구현",
      "folderName": "인증",
      "lockedBy": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "홍길동"
      },
      "lockedAt": "2026-04-01T10:00:00.000Z",
      "isProcessing": true
    }
  ],
  "onlineUsers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "activeSessionId": "ggg-hhh-iii"
    }
  ]
}
```

### 11.2 GET /api/projects/:id/dashboard/stats
프로젝트 통계를 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `period` | string | 아니오 | `today` / `week` / `month` (기본: `week`) |

**응답 (200):**
```json
{
  "period": "week",
  "totalCommits": 45,
  "totalSessions": 12,
  "totalMessages": 180,
  "commitsByUser": [
    { "userId": "550e...", "name": "홍길동", "count": 20 },
    { "userId": "660e...", "name": "김철수", "count": 15 }
  ],
  "commitsByFolder": [
    { "folderId": "ddd...", "name": "인증", "count": 18 },
    { "folderId": "eee...", "name": "결제", "count": 12 }
  ],
  "activityByDay": [
    { "date": "2026-03-26", "commits": 5, "messages": 22 },
    { "date": "2026-03-27", "commits": 8, "messages": 30 }
  ]
}
```

### 11.3 GET /api/projects/:id/dashboard/file-changes
파일 변경 맵을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `period` | string | 아니오 | `today` / `week` / `month` (기본: `week`) |

**응답 (200):**
```json
{
  "period": "week",
  "files": [
    {
      "path": "src/auth/login.ts",
      "changeCount": 5,
      "lastModified": "2026-04-01T10:30:00.000Z",
      "contributors": ["홍길동", "김철수"]
    },
    {
      "path": "src/auth/register.ts",
      "changeCount": 3,
      "lastModified": "2026-03-31T15:00:00.000Z",
      "contributors": ["홍길동"]
    }
  ]
}
```

### 11.4 GET /api/projects/:id/dashboard/usage
팀원별 사용량을 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `period` | string | 아니오 | `today` / `week` / `month` (기본: `week`) |

**응답 (200):**
```json
{
  "period": "week",
  "usage": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "홍길동",
      "sessionCount": 5,
      "messageCount": 80,
      "totalDurationMs": 3600000,
      "estimatedCostUsd": 2.50
    }
  ]
}
```

---

## 12. Branches (브랜치 목록)

### 12.1 GET /api/projects/:id/branches
프로젝트 레포의 로컬 브랜치 목록과 main 대비 ahead/behind 정보를 반환한다.

- **인증 필요:** 예
- **권한:** 프로젝트 멤버

**응답 예시 (200)**
```json
{
  "branches": [
    { "name": "main", "current": true, "hash": "abc123", "status": "latest", "aheadCount": 0, "behindCount": 0, "author": "관리자" },
    { "name": "feature/auth", "current": false, "hash": "def456", "status": "ahead", "aheadCount": 3, "behindCount": 0, "author": "김민수" }
  ]
}
```

**status 값:**
- `latest` — main과 동일
- `ahead` — main보다 앞선 커밋 있음
- `behind` — main보다 뒤처진 커밋 있음
- `diverged` — 앞서거나 뒤처진 커밋 모두 존재

---

## 13. Skills (CLAUDE.md / skills.md 관리)

### 13.1 GET /api/projects/:id/skills/claude-md
프로젝트의 CLAUDE.md 파일 내용을 읽는다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "content": "# CLAUDE.md\n\n## 프로젝트 규칙\n...",
  "path": "/home/ubuntu/projects/shopping-mall/CLAUDE.md",
  "lastModified": "2026-04-01T09:00:00.000Z"
}
```

### 13.2 PUT /api/projects/:id/skills/claude-md
프로젝트의 CLAUDE.md 파일을 저장한다.

- **인증 필요:** 예

**요청:**
```json
{
  "content": "# CLAUDE.md\n\n## 프로젝트 규칙\n- TypeScript strict mode 필수\n..."
}
```

**응답 (200):**
```json
{
  "message": "CLAUDE.md가 저장되었습니다.",
  "path": "/home/ubuntu/projects/shopping-mall/CLAUDE.md",
  "lastModified": "2026-04-01T11:00:00.000Z"
}
```

### 13.3 GET /api/projects/:id/skills/skills-md
프로젝트의 `.claude/skills.md` 파일 내용을 읽는다.

- **인증 필요:** 예

**응답 (200):**
```json
{
  "content": "# Skills\n\n## 자동 커밋 규칙\n...",
  "path": "/home/ubuntu/projects/shopping-mall/.claude/skills.md",
  "lastModified": "2026-04-01T09:00:00.000Z"
}
```

### 13.4 PUT /api/projects/:id/skills/skills-md
프로젝트의 `.claude/skills.md` 파일을 저장한다.

- **인증 필요:** 예

**요청:**
```json
{
  "content": "# Skills\n\n## 자동 커밋 규칙\n- 매 작업 후 자동 커밋\n..."
}
```

**응답 (200):**
```json
{
  "message": "skills.md가 저장되었습니다.",
  "path": "/home/ubuntu/projects/shopping-mall/.claude/skills.md",
  "lastModified": "2026-04-01T11:00:00.000Z"
}
```

---

## 13. Tree (전체 트리 조회)

### 13.1 GET /api/tree
프로젝트 > 폴더 > 세션 전체 트리 구조를 한 번에 조회한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `projectId` | string | 아니오 | 특정 프로젝트만 조회 (미지정 시 전체) |

**응답 (200):**
```json
{
  "tree": [
    {
      "id": "aaa-bbb-ccc",
      "name": "쇼핑몰",
      "type": "project",
      "folders": [
        {
          "id": "ddd-eee-fff",
          "name": "인증",
          "type": "folder",
          "sessions": [
            {
              "id": "ggg-hhh-iii",
              "title": "로그인 API 구현",
              "status": "active",
              "lockedBy": { "id": "550e...", "name": "홍길동" },
              "type": "session"
            },
            {
              "id": "jjj-kkk-lll",
              "title": "JWT 리프레시 로직",
              "status": "active",
              "lockedBy": null,
              "type": "session"
            }
          ]
        }
      ]
    }
  ]
}
```

> **특이사항:** 좌측 사이드바 렌더링용. 페이지네이션 없이 전체를 반환한다.

### 13.2 GET /api/tree/file
프로젝트 repoPath 기준 상대 경로로 파일 내용을 읽어 반환한다. 코드 뷰어에서 사용한다.

- **인증 필요:** 예

**쿼리 파라미터:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `path` | string | 예 | repoPath 기준 상대 파일 경로 |
| `projectId` | string (UUID) | 예 | 프로젝트 ID |

**응답 (200):**
```json
{
  "content": "import React from 'react';\n...",
  "path": "src/components/App.tsx",
  "language": "typescriptreact"
}
```

**에러 응답:**
| HTTP 상태 | code | 설명 |
|-----------|------|------|
| 403 | `FORBIDDEN_PATH` | repoPath 외부 경로 접근 시도 (경로 트래버설 차단) |
| 404 | `PROJECT_NOT_FOUND` | 프로젝트 없음 |
| 404 | `FILE_NOT_FOUND` | 파일 없음 |
| 400 | `IS_DIRECTORY` | 디렉토리 경로 지정 시 |
| 413 | `FILE_TOO_LARGE` | 파일 크기 5MB 초과 |

> **특이사항:** `language` 필드는 확장자 기반으로 추론한다 (ts→typescript, tsx→typescriptreact, py→python 등).

---

## 14. 웹 터미널 (Socket.IO)

Socket.IO 네임스페이스 `/terminal`을 통해 웹 터미널 세션을 관리한다.
node-pty 기반 bash 프로세스를 spawn하며, node-pty 미설치 시 child_process.spawn으로 fallback한다.

### 연결
```
ws://{host}/socket.io/?EIO=4&transport=websocket&ns=/terminal
```

### 클라이언트 → 서버 이벤트

| 이벤트 | payload | 설명 |
|--------|---------|------|
| `terminal:start` | `{ projectId?: string, cols?: number, rows?: number }` | 터미널 세션 시작. cwd는 프로젝트 repoPath로 설정 |
| `terminal:input` | `string` | 키 입력 데이터를 pty stdin에 전달 |
| `terminal:resize` | `{ cols: number, rows: number }` | 터미널 크기 변경 |

### 서버 → 클라이언트 이벤트

| 이벤트 | payload | 설명 |
|--------|---------|------|
| `terminal:ready` | `{ cwd: string }` | 터미널 준비 완료 |
| `terminal:output` | `string` | pty stdout/stderr 출력 데이터 |
| `terminal:error` | `{ error: { code: string, message: string } }` | 터미널 오류 |

> **특이사항:** 클라이언트 disconnect 시 해당 socketId의 pty 프로세스가 자동으로 kill된다.

---

## SSE 이벤트 스키마

채팅(7.1)과 PM 질의(9.1, 9.2)에서 사용하는 SSE 이벤트 형식.

전송 형식: `event: {type}\ndata: {json}\n\n`

스트림 종료: `done` 이벤트 수신 시 완료.

### 이벤트 타입

| event | 설명 | data 구조 |
|-------|------|-----------|
| `assistant_text` | AI의 텍스트 응답 조각 | `{ content: string }` |
| `tool_use_begin` | AI가 도구 호출을 시작할 때 | `{ toolId: string, tool: string }` |
| `tool_use_input` | 도구 호출의 입력 데이터 | `{ toolId: string, input: object }` |
| `tool_use_end` | 도구 호출 완료 | `{ toolId: string }` |
| `tool_result` | 도구 실행 결과 | `{ toolId: string, output: string, isError: boolean }` |
| `system` | 시스템 이벤트 | `{ subtype: 'init' \| 'compaction' \| 'error', message?: string }` |
| `done` | 전체 응답 완료 | `{ messageId: string, sessionId: string, totalTokens: number }` |

### 각 이벤트의 data 구조

**assistant_text:**
```json
{
  "content": "로그인 API를 구현하겠습니다."
}
```

**tool_use_begin:**
```json
{
  "toolId": "tool-001",
  "tool": "Write"
}
```

**tool_use_input:**
```json
{
  "toolId": "tool-001",
  "input": {
    "filePath": "src/auth/login.ts",
    "content": "import express from 'express';\n..."
  }
}
```

**tool_use_end:**
```json
{
  "toolId": "tool-001"
}
```

**tool_result:**
```json
{
  "toolId": "tool-001",
  "output": "파일이 생성되었습니다.",
  "isError": false
}
```

**system:**
```json
{
  "subtype": "init",
  "message": "세션을 초기화합니다."
}
```

```json
{
  "subtype": "compaction",
  "message": "컨텍스트를 압축합니다."
}
```

```json
{
  "subtype": "error",
  "message": "Claude Code 프로세스가 비정상 종료되었습니다."
}
```

**done:**
```json
{
  "messageId": "msg-001",
  "sessionId": "ggg-hhh-iii",
  "totalTokens": 1500
}
```

---

## WebSocket (Socket.IO) 이벤트

### 인증
Socket.IO 연결 시 쿠키가 자동으로 전송된다 (별도 token 불필요).

```typescript
const socket = io("https://nexus.example.com", {
  withCredentials: true
});
```

서버는 연결 시 쿠키의 세션을 검증하고, 유효하지 않으면 연결을 거부한다.

### 네임스페이스/룸 구조

| 룸 | 형식 | 설명 |
|----|------|------|
| 프로젝트 룸 | `project:{projectId}` | 해당 프로젝트의 모든 이벤트 수신 |
| 세션 룸 | `session:{sessionId}` | 해당 세션의 상세 이벤트 수신 |

클라이언트는 프로젝트 룸에 join하면 해당 프로젝트의 모든 세션/커밋/대시보드 이벤트를 수신한다. 특정 세션 상세 이벤트(메시지 추가 등)는 세션 룸에 join해야 수신한다.

### 이벤트 목록

#### 세션 관련

**`session:lock`** -- 클라이언트 -> 서버
세션 락을 요청한다.
```json
{
  "data": { "sessionId": "ggg-hhh-iii" },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

**`session:unlock`** -- 클라이언트 -> 서버
세션 락을 해제한다.
```json
{
  "data": { "sessionId": "ggg-hhh-iii" },
  "timestamp": "2026-04-01T10:30:00.000Z"
}
```

**`session:lock-updated`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
세션 락 상태가 변경되었음을 알린다.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "lockedBy": { "id": "550e...", "name": "홍길동" },
    "lockedAt": "2026-04-01T10:00:00.000Z"
  },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

> `lockedBy`는 락이 해제되면 `null`이 된다.

**`session:lock-request`** -- 서버 -> 클라이언트 (락 보유자에게)
다른 사용자가 락을 요청했음을 알린다.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "requestedBy": { "id": "660e...", "name": "김철수" },
    "message": "급한 버그 수정이 필요합니다."
  },
  "timestamp": "2026-04-01T10:15:00.000Z"
}
```

**`session:message-new`** -- 서버 -> 클라이언트 (세션 룸 브로드캐스트)
세션에 새 메시지가 추가되었음을 알린다. 다른 팀원이 세션을 열람 중일 때 실시간 업데이트.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "messageId": "msg-001",
    "role": "user",
    "content": "로그인 API를 Express로 구현해줘",
    "userId": "550e...",
    "userName": "홍길동"
  },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

**`session:created`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
새 세션이 생성되었음을 알린다. 사이드바 트리 실시간 업데이트.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "folderId": "ddd-eee-fff",
    "title": "로그인 API 구현",
    "createdBy": { "id": "550e...", "name": "홍길동" }
  },
  "timestamp": "2026-04-01T09:00:00.000Z"
}
```

**`session:archived`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
세션이 아카이브되었음을 알린다.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "status": "archived"
  },
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

**`session:abort`** -- 클라이언트 -> 서버
진행 중인 AI 응답 중단을 요청한다.
```json
{
  "data": { "sessionId": "ggg-hhh-iii" },
  "timestamp": "2026-04-01T10:05:00.000Z"
}
```

#### Git 관련

**`git:commit-new`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
새 커밋이 감지되었음을 알린다. 대시보드 커밋 타임라인 실시간 업데이트.
```json
{
  "data": {
    "projectId": "aaa-bbb-ccc",
    "sessionId": "ggg-hhh-iii",
    "hash": "a1b2c3d4...",
    "message": "[로그인 API 구현] JWT 인증 로직 추가 - 홍길동",
    "author": "홍길동",
    "filesChanged": ["src/auth/login.ts"]
  },
  "timestamp": "2026-04-01T10:30:00.000Z"
}
```

#### 대시보드 관련

**`dashboard:activity-updated`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
작업 현황이 변경되었음을 알린다 (세션 시작/종료, 락 변경 등).
```json
{
  "data": {
    "projectId": "aaa-bbb-ccc",
    "activeSessions": [
      {
        "sessionId": "ggg-hhh-iii",
        "title": "로그인 API 구현",
        "lockedBy": { "id": "550e...", "name": "홍길동" },
        "isProcessing": true
      }
    ]
  },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

#### 외부 알림 (브라우저/알림음 트리거)

**`session:task-complete`** -- 서버 -> 클라이언트 (특정 사용자에게)
Claude Code 세션의 작업이 완료되었음을 알린다.
클라이언트는 `notifyBrowser`, `notifySound` 플래그를 확인하여 각 동작을 독립적으로 실행한다.
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "sessionTitle": "로그인 API 구현",
    "projectName": "쇼핑몰 백엔드",
    "notifyBrowser": true,
    "notifySound": true
  },
  "timestamp": "2026-04-01T11:00:00.000Z"
}
```

> **동작:** `notifyBrowser=true`이면 탭이 백그라운드일 때 OS 데스크톱 알림 표시.
> `notifySound=true`이면 Web Audio API로 알림음 재생.
> SMS 발송은 서버 측에서 처리되며 클라이언트에는 별도 이벤트 없음.

**`session:permission-required`** -- 서버 -> 클라이언트 (특정 사용자에게)
Claude Code가 실행 중 사용자 확인이 필요한 경우 알린다 (예: 위험한 명령 실행 전 허가 요청).
```json
{
  "data": {
    "sessionId": "ggg-hhh-iii",
    "sessionTitle": "로그인 API 구현",
    "notifyBrowser": true,
    "notifySound": true
  },
  "timestamp": "2026-04-01T10:45:00.000Z"
}
```

> **동작:** `notifyBrowser`, `notifySound` 처리 방식은 `session:task-complete`와 동일.
> 클라이언트는 해당 세션으로 이동하여 Claude Code의 허가 요청 UI를 표시해야 한다.

#### 알림 관련

**`notification:new`** -- 서버 -> 클라이언트 (특정 사용자에게)
새 알림을 전달한다 (락 요청, 작업 완료, 에러 등).
```json
{
  "data": {
    "id": "notif-001",
    "type": "lock_request",
    "payload": {
      "title": "락 요청",
      "message": "김철수 님이 '로그인 API 구현' 세션의 락을 요청했습니다.",
      "sessionId": "ggg-hhh-iii"
    },
    "isRead": false,
    "createdAt": "2026-04-01T10:15:00.000Z"
  },
  "timestamp": "2026-04-01T10:15:00.000Z"
}
```

#### 사용자 상태 관련

**`user:status-changed`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
사용자의 온라인/오프라인 상태가 변경되었음을 알린다.
```json
{
  "data": {
    "userId": "550e...",
    "name": "홍길동",
    "status": "online",
    "activeSessionId": "ggg-hhh-iii"
  },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

**`project:online-users`** -- 서버 -> 클라이언트 (프로젝트 룸 브로드캐스트)
프로젝트 룸에 접속/이탈 시 현재 온라인 사용자 전체 목록을 전송한다.
```json
{
  "data": {
    "projectId": "aaa-bbb-ccc",
    "onlineUsers": [
      {
        "userId": "550e...",
        "name": "홍길동",
        "activeSessionId": "ggg-hhh-iii"
      },
      {
        "userId": "660e...",
        "name": "김철수",
        "activeSessionId": null
      }
    ]
  },
  "timestamp": "2026-04-01T10:00:00.000Z"
}
```

---

## 설계 결정 사항

### 채팅 시 락 자동 획득
- `POST /api/sessions/:id/chat` 요청 시 서버가 자동으로 세션 락을 획득하거나 갱신한다.
- 이미 본인이 락을 보유 중이면 타이머만 리셋한다.
- 다른 사용자가 락을 보유 중이면 `409 SESSION_LOCKED` 에러를 반환한다.
- 프론트엔드에서 별도로 lock API를 호출할 필요가 없다.
- 채팅 시 `lastActivityAt`이 자동으로 갱신된다.

### CLI 프로세스 생명주기
- CLI 프로세스의 exit 이벤트 감지 시 락이 자동으로 해제된다.
- 서버 시작 시 모든 `locked_by`를 `null`로 초기화한다 (고스트 락 방지).

### Abort 처리
- `POST /api/sessions/:id/abort` 호출 시 백엔드는 해당 세션의 Claude Code CLI 프로세스에 SIGTERM을 전송한다.
- 세션 락은 유지된다 (중단해도 작업 세션이 끝난 것이 아님).
- 중단 시점까지의 부분 결과(텍스트, 파일 변경 등)는 DB에 저장된다.
- WebSocket `session:abort` 이벤트로도 중단을 요청할 수 있다 (SSE 연결이 끊어진 경우 대비).

### 커밋 DB 동기화
- 채팅 응답 완료(`done` 이벤트) 후, 서버는 `simple-git`으로 git log를 조회하여 DB에 없는 새 커밋을 감지한다.
- 감지된 커밋은 `commits` 테이블에 저장하고, 해당 세션과 매핑한다.
- WebSocket `git:commit-new` 이벤트로 프로젝트 룸에 브로드캐스트한다.
- 이를 통해 대시보드의 커밋 타임라인이 실시간으로 갱신된다.

### 세션 락 자동 해제
- 서버 측 `setInterval`로 `last_activity_at`을 주기적으로 체크한다 (1분 간격).
- 마지막 활동(채팅, 락 갱신)으로부터 일정 시간 무입력 시 자동 해제한다.
- 자동 해제 시 `session:lock-updated` 이벤트로 브로드캐스트한다.

### Worktree 기반 세션 격리
- 세션 생성(`POST /api/sessions`) 시 `git worktree add`로 독립 작업 디렉토리와 브랜치를 생성한다.
- `worktreePath`와 `branchName`이 DB에 저장된다.
- 채팅 시 CLI의 `cwd`는 해당 세션의 `worktreePath`로 설정한다.
- 세션 아카이브(`PATCH /api/sessions/:id`, `status: "archived"`) 시 worktree 브랜치를 main에 merge하고, 충돌 발생 시 AI가 자동으로 해결을 시도한다.
- merge 완료 후 `git worktree remove`로 작업 디렉토리를 정리한다.
- 자동 merge 실패 시 `POST /api/sessions/:id/merge`로 수동 재시도가 가능하다.

### Merge 직렬화 (프로젝트 레벨 Merge Queue)
- 동일 프로젝트에서 여러 세션이 동시에 merge를 시도하면 git `index.lock` 충돌이 발생한다.
- 이를 방지하기 위해 프로젝트별 merge queue를 구현한다.
- 서버 메모리에 프로젝트별 큐(Map<projectId, Queue>)를 유지하고, merge 요청을 순차 실행한다.
- 구현 방식: `async-mutex` 또는 직접 구현한 프로젝트별 세마포어(concurrency=1).
- merge 진행 중인 프로젝트에 추가 merge 요청이 들어오면 큐에 대기시키고, 완료 후 순차 처리한다.

### AI 자동 Merge 충돌 해결
- 세션 아카이브 시 `git merge session/xxx`를 실행한다.
- 충돌 발생 시 Claude Code CLI를 활용하여 충돌 마커를 자동 해결한다:
  1. 충돌 파일 목록을 `git diff --name-only --diff-filter=U`로 수집
  2. `claude -p "다음 파일들의 merge 충돌을 해결해줘: {파일목록}" --allowedTools "Read,Edit,Bash" --output-format stream-json` 실행 (cwd=프로젝트 메인 레포)
  3. 해결 완료 후 `git add . && git commit`으로 merge commit 생성
- 자동 해결 실패 시 `mergeStatus: "conflict"`로 설정하고, `POST /api/sessions/:id/merge`로 수동 재시도를 지원한다.

### Lock Transfer API
세션 락을 원자적으로 이전하여 race condition을 방지한다.

**`POST /api/sessions/:id/lock-transfer`**

- **인증 필요:** 예
- 현재 락 보유자가 특정 사용자에게 락을 직접 이전한다.

**요청:**
```json
{
  "toUserId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**응답 (200):**
```json
{
  "sessionId": "ggg-hhh-iii",
  "lockedBy": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "김철수"
  },
  "lockedAt": "2026-04-01T10:20:00.000Z",
  "transferredFrom": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "홍길동"
  }
}
```

> **특이사항:** 본인이 보유한 락만 이전 가능. 트랜잭션으로 원자적 처리하여 중간 상태(락 없음)가 발생하지 않는다. `session:lock-updated` WebSocket 이벤트로 브로드캐스트.

### Linux 사용자 전환 (구독 모드)
- 구독 모드(`authMode: "subscription"`)에서는 팀원별 리눅스 유저로 Claude Code를 실행해야 한다.
- 백엔드에서 `child_process.spawn`의 `uid`/`gid` 옵션으로 사용자를 전환한다:
  ```typescript
  const userInfo = os.userInfo(); // 기본
  const targetUser = getUserLinuxInfo(session.creator.linuxUser); // lookup
  spawn('claude', args, {
    cwd: worktreePath,
    uid: targetUser.uid,
    gid: targetUser.gid,
    env: { ...process.env, HOME: `/home/${session.creator.linuxUser}` },
  });
  ```
- Nexus 백엔드 프로세스는 `root` 또는 적절한 권한 그룹에서 실행하여 다른 사용자로 전환 가능해야 한다.
- API 모드(`authMode: "api"`)에서는 사용자 전환 없이 `ANTHROPIC_API_KEY` 환경변수만 설정한다.

### JSONL 세션 파일 접근 (세션 이어받기)
- Claude Code JSONL 파일은 각 리눅스 유저의 홈 디렉토리(`~/.claude/projects/`)에 저장된다.
- 세션 이어받기(`--resume`)를 위해 다른 사용자의 JSONL에 접근이 필요하다.
- 해결 방안: 모든 팀원 리눅스 유저를 공통 그룹(`nexus-team`)에 추가하고, JSONL 디렉토리의 그룹 읽기 권한을 부여한다:
  ```bash
  # 초기 설정
  groupadd nexus-team
  usermod -aG nexus-team hong
  usermod -aG nexus-team kim
  # 각 유저의 .claude 디렉토리에 그룹 권한 설정
  chmod -R g+r /home/hong/.claude/
  chmod g+s /home/hong/.claude/  # 새 파일에도 그룹 상속
  ```
- 백엔드는 세션 이어받기 시 원래 생성자의 JSONL 경로를 참조하여 `--resume`을 실행한다.

### Claude Code 세션 매핑
- Nexus 세션 생성 시 `claudeSessionId`는 `null`이다.
- 첫 채팅 메시지 전송 시 `claude -p "..." --output-format stream-json` 실행 후, Claude Code가 반환하는 session ID를 DB에 저장한다.
- 이후 요청은 `claude -p "..." --resume {claudeSessionId} --output-format stream-json`으로 세션을 이어간다.
- `cwd`는 항상 해당 세션의 `worktreePath`로 설정한다.
