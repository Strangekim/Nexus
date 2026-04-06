import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(',') ?? [],
  transpilePackages: ['@xterm/xterm', '@xterm/addon-fit'],
  // 클라이언트 컴포넌트 기반 앱 — 정적 prerender 비활성화
  experimental: {
    staticGenerationRetryCount: 0,
  },
};

export default nextConfig;
