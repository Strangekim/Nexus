---
name: infrastructure
description: Nexus 인프라 구성 및 운영 규칙 (EC2 호스트 직접 실행)
---
# 인프라 운영 규칙

## 아키텍처 핵심
- **모든 서비스 EC2 호스트에서 직접 실행** (Docker 사용하지 않음)
- **프론트엔드(Next.js) + 백엔드(Fastify)**: pm2로 프로세스 관리
- **PostgreSQL**: 호스트에 직접 설치 (`apt install postgresql`)
- **Nginx**: 호스트에서 리버스 프록시로 실행
- **Claude Code CLI**: 호스트에 직접 설치, 백엔드에서 `child_process.spawn`으로 호출

## 서비스 구성
| 서비스 | 포트 | 실행 방식 |
|--------|------|-----------|
| frontend | 3000 | `npm run start` (pm2) |
| backend | 8080 | `npm run start` (pm2) |
| postgres | 5432 | 호스트 직접 실행 (systemd) |
| nginx | 80/443 | 호스트 직접 실행 |

## 개발 환경 명령어
- PostgreSQL 상태 확인: `sudo systemctl status postgresql`
- 백엔드 개발: `cd backend && npm run dev`
- 프론트엔드 개발: `cd frontend && npm run dev`
- DB 마이그레이션: `cd backend && npx prisma migrate dev`

## 프로덕션 명령어
- 프론트엔드 빌드: `cd frontend && npm run build`
- 백엔드 빌드: `cd backend && npm run build`
- 프로세스 관리: `pm2 start ecosystem.config.js`
- 프로세스 재시작: `pm2 restart all`

## 주의사항
- 프로젝트 디렉토리(`/home/ubuntu/projects/`)는 호스트 파일시스템에서 직접 접근
- `.env` 파일은 각 서비스 루트에 배치 — Git 커밋 절대 금지
- PostgreSQL 데이터는 기본 데이터 디렉토리(`/var/lib/postgresql/`)에 저장
- Nginx에서 WebSocket 업그레이드 헤더 설정 필수
