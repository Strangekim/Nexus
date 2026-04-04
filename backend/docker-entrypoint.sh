#!/bin/bash
# Docker 엔트리포인트: Prisma 마이그레이션 실행 후 서버 시작

set -e

echo "=== Prisma 마이그레이션 실행 ==="
npx prisma migrate deploy

echo "=== 필수 디렉토리 생성 ==="
mkdir -p /data/claude-configs
mkdir -p /data/projects
mkdir -p /data/projects-wt

echo "=== 서버 시작 ==="
exec npx tsx src/index.ts
