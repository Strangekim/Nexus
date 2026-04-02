배포 프로세스를 실행한다:

1. 프론트엔드 빌드: `cd frontend && npm run build`
2. 백엔드 빌드: `cd backend && npm run build`
3. 빌드 에러 없는지 확인
4. DB 마이그레이션 적용: `cd backend && npx prisma migrate deploy`
5. pm2로 프로세스 재시작: `pm2 restart all` (또는 `pm2 start ecosystem.config.js`)
6. Nginx 설정 리로드 (변경 시): `sudo nginx -t && sudo systemctl reload nginx`
7. 배포 결과 확인 및 보고
