import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3.36.158.59'],
  transpilePackages: ['@xterm/xterm', '@xterm/addon-fit'],
  // 클라이언트 컴포넌트 기반 앱 — 정적 prerender 비활성화
  experimental: {
    staticGenerationRetryCount: 0,
  },
};

export default nextConfig;
