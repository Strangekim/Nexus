개발 서버를 시작한다:

1. PostgreSQL 실행 확인: `sudo systemctl status postgresql`
2. DB 마이그레이션 확인: `cd backend && npx prisma migrate dev`
3. 백엔드 개발 서버 시작: `cd backend && npm run dev`
4. 프론트엔드 개발 서버 시작: `cd frontend && npm run dev`
5. 각 서비스 정상 구동 확인 (백엔드: http://localhost:8080, 프론트: http://localhost:3000)
