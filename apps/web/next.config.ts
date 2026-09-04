import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ai-series/config", "@ai-series/ui", "@ai-series/db"],
};

export default nextConfig;
