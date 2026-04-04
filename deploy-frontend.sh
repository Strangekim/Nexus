#!/bin/bash
# 프론트엔드 빌드 + 재시작 스크립트
set -e
cd /home/ubuntu/Nexus/frontend

echo "=== 빌드 시작 ==="
rm -rf .next
npm run build

echo "=== 기존 서버 종료 ==="
kill -9 $(lsof -ti:3000) 2>/dev/null || true
sleep 2

echo "=== 서버 시작 ==="
nohup npx next start --hostname 0.0.0.0 > /tmp/fe-latest.log 2>&1 &
sleep 5

echo "=== 검증 ==="
curl -s -o /dev/null -w "status: %{http_code}\n" http://localhost:3000
echo "완료!"
