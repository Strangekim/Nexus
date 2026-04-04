# ============================================================
# Nexus Backend — Fastify + Prisma + Claude Code CLI
# 베이스: node:20-bookworm (node-pty에 glibc 필요, Alpine 불가)
# ============================================================

FROM node:20-bookworm AS builder

# 시스템 의존성 설치 (node-pty 빌드에 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    python3 \
    sudo \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 캐싱을 위해 package 파일 먼저 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN npx prisma generate

# ============================================================
# 프로덕션 스테이지
# ============================================================
FROM node:20-bookworm

# 런타임 시스템 의존성 (git: simple-git/worktree, python3: node-pty)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    python3 \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI 전역 설치
RUN npm install -g @anthropic-ai/claude-code

# 비root 사용자 생성 (필요 권한 부여)
RUN groupadd -r appuser && useradd -r -g appuser -m -s /bin/bash appuser \
    && echo "appuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /app

# 빌더에서 node_modules와 소스 복사
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# 데이터 디렉토리 생성 및 권한 설정
RUN mkdir -p /data/claude-configs /data/projects /data/projects-wt \
    && chown -R appuser:appuser /app /data

# 엔트리포인트 스크립트 실행 권한 부여
RUN chmod +x docker-entrypoint.sh

# 환경변수 기본값
ENV NODE_ENV=production
ENV PORT=8080
ENV CLAUDE_CONFIGS_DIR=/data/claude-configs
ENV PROJECTS_DIR=/data/projects
ENV PROJECTS_WT_DIR=/data/projects-wt

# 볼륨 마운트 포인트
VOLUME ["/data/claude-configs", "/data/projects", "/data/projects-wt"]

EXPOSE 8080

USER appuser

ENTRYPOINT ["./docker-entrypoint.sh"]
