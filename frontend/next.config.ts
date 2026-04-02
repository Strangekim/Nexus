import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['13.125.254.113'],
  transpilePackages: ['@xterm/xterm', '@xterm/addon-fit'],
};

export default nextConfig;
