---
name: streaming
description: Claude Code CLI stream-json 파싱 및 SSE 전달 규칙
---
# 스트리밍 파이프라인 규칙

## 파이프라인 흐름
```
사용자 입력
  → Backend: child_process.spawn('claude', ['-p', 입력, '--output-format', 'stream-json', '--resume', sessionId], { cwd: 프로젝트경로 })
  → stream-json 출력 파싱
  → SSE로 프론트엔드 전달
  → 프론트: 실시간 렌더링
```

## Claude Code CLI 실행 옵션
- `-p "프롬프트"` — 비대화식 실행
- `--output-format stream-json` — JSON 스트림 출력
- `--resume {session-id}` — 세션 이어가기
- `--allowedTools "..."` — 허용 도구 제한
- `cwd`를 `/home/ubuntu/projects/{프로젝트명}/`으로 설정

## PM 질의 모드 (읽기 전용)
- `--allowedTools "Read,Glob,Grep"` — 파일 수정 불가
- 세션 요약 + Git 로그를 프롬프트에 포함하여 현황 답변 생성

## stream-json 이벤트 처리
- `assistant` 메시지 → SSE로 텍스트 스트리밍
- `tool_use` 이벤트 → 터미널 뷰어에 명령/결과 표시
- `result` → 작업 완료 처리, DB 저장

## 주의사항
- spawn 프로세스의 stdout를 라인 단위로 파싱 (JSON.parse per line)
- 프로세스 비정상 종료 시 세션 락 자동 해제
- SSE 연결 끊김 시 재연결 + 마지막 이벤트 ID 기반 복구
