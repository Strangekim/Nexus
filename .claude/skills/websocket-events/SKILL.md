---
name: websocket-events
description: Socket.IO 실시간 이벤트 설계 규칙
---
# Socket.IO 이벤트 설계 규칙

## 이벤트 네이밍
- 형식: `도메인:액션` (kebab-case)
- 예시:
  - `session:lock` / `session:unlock` — 세션 락 획득/해제
  - `session:lock-request` — 락 가져오기 요청
  - `session:lock-updated` — 락 상태 변경 브로드캐스트
  - `dashboard:activity-updated` — 작업 현황 갱신
  - `notification:new` — 새 알림

## 페이로드 형식
```typescript
interface SocketPayload<T> {
  data: T;
  timestamp: string; // ISO 8601
}
```
- JSON 프로퍼티는 camelCase
- 에러 시: `{ error: { code: string, message: string } }`

## 네임스페이스/룸 구조
- 프로젝트별 룸: `project:{projectId}`
- 세션별 룸: `session:{sessionId}`
- 클라이언트는 프로젝트 룸에 join → 해당 프로젝트의 모든 이벤트 수신

## 주의사항
- 락 상태 변경은 반드시 WebSocket으로 실시간 동기화
- 무입력 10~15분 시 자동 락 해제 → 타이머는 백엔드에서 관리
- 재연결 시 현재 락 상태 동기화 처리 필수
