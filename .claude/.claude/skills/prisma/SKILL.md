---
name: prisma
description: Prisma ORM 및 DB 마이그레이션 워크플로우 규칙
---
# Prisma 워크플로우 규칙

## 스키마 변경 시
1. `backend/prisma/schema.prisma` 수정
2. 마이그레이션 생성: `cd backend && npx prisma migrate dev --name 설명`
3. 타입 재생성 확인: `npx prisma generate`
4. 변경된 schema.prisma + migration 파일 함께 커밋

## 네이밍
- 테이블명: snake_case 복수형 (예: usage_logs)
- 컬럼명: snake_case (예: created_at, locked_by)
- Prisma 모델명: PascalCase 단수형 (예: UsageLog)
- 관계 필드: camelCase (예: createdBy, sessionId)

## 주의사항
- 운영 DB에 직접 SQL 실행 금지 — 반드시 migration 사용
- seed 데이터: `backend/prisma/seed.ts`에 작성
- JSONB 컬럼 사용 시 Prisma의 `Json` 타입 활용 (예: files_changed)
- UUID를 기본 PK로 사용: `@id @default(uuid())`
