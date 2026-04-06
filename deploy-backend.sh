#!/bin/bash
# 백엔드 재시작 스크립트 (수동 모드)
set -e
echo "=== 백엔드 종료 ==="
kill -9 $(lsof -ti:8080) 2>/dev/null || true
sleep 2
echo "=== 백엔드 시작 ==="
cd /home/ubuntu/Nexus/backend
nohup npx tsx src/index.ts > /tmp/be-prod.log 2>&1 &
sleep 5
echo "=== 검증 ==="
curl -s http://localhost:8080/api/health && echo ""
echo "완료!"
