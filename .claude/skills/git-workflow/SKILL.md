---
name: git-workflow
description: Git 자동 관리 및 simple-git 활용 규칙
---
# Git 워크플로우 규칙

## 자동 커밋 (Claude Code가 수행)
- 커밋 메시지 형식: `[세션명] 작업 요약 - 작업자`
- 매 작업 완료 시 자동 커밋 (Skills의 commit 규칙에 의해)
- .env 파일 포함 여부 반드시 확인

## Nexus 백엔드의 Git 관리 (simple-git)
Nexus는 직접 커밋하지 않고, 조회/롤백만 담당:
- **로그 조회**: `git.log()` — 커밋 히스토리, 세션별 필터링
- **Diff 생성**: `git.diff([commitHash1, commitHash2])` — 변경사항 비교
- **Revert 실행**: `git.revert(commitHash)` — 원클릭 롤백 (새 revert 커밋 생성)

## 커밋 타임라인 시각화
- 세션별 색 구분으로 표시
- 각 커밋에 세션 ID, 작업자, 변경 파일 목록 연결
- commits 테이블에 files_changed(JSONB)로 변경 파일 저장

## 주의사항
- force push 금지 — revert로 되돌리기
- 프로젝트 디렉토리 = Git 레포 루트 (1:1 매핑)
- GitHub 원격 백업 주기적 push
