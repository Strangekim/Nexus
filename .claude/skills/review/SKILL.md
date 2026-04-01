---
name: review
description: 코드 리뷰 체크리스트
---
# 코드 리뷰 체크리스트

- [ ] TypeScript strict mode 위반 없는지 확인
- [ ] ESM import/export 사용 여부
- [ ] 에러 처리(try-catch) 적절한지 확인
- [ ] 네이밍 컨벤션 준수 (camelCase, PascalCase, snake_case)
- [ ] .env 파일 또는 민감 정보 노출 여부
- [ ] API 엔드포인트 추가 시 docs/api-spec.md 업데이트 여부
- [ ] DB 스키마 변경 시 Prisma migration 생성 여부
