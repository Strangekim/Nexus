# ============================================================
# Nexus Frontend — Next.js 멀티스테이지 빌드
# ============================================================

# --- 빌드 스테이지 ---
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# 의존성 캐싱을 위해 package 파일 먼저 복사
COPY package.json package-lock.json ./

# 의존성 설치
RUN npm ci

# 소스 코드 복사
COPY . .

# 빌드 시 API URL 설정 (런타임에도 덮어쓸 수 있음)
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Next.js 빌드
RUN npm run build

# --- 프로덕션 스테이지 ---
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 비root 사용자 생성
RUN groupadd -r appuser && useradd -r -g appuser -m -s /bin/bash appuser

# 빌드 결과물 복사 (standalone 없이 전체 복사)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chown -R appuser:appuser /app

EXPOSE 3000

USER appuser

CMD ["npx", "next", "start"]
