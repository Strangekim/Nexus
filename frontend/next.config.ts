import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3.36.158.59'],
  transpilePackages: ['@xterm/xterm', '@xterm/addon-fit'],
};

export default nextConfig;
