import { config } from "dotenv";
import { join } from "node:path";
import type { NextConfig } from "next";

config({ path: join(process.cwd(), "..", "..", ".env") });

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-series/config",
    "@ai-series/ui",
    "@ai-series/db",
    "@ai-series/prompts",
    "@ai-series/fal",
    "@ai-series/generation",
    "@ai-series/jobs",
    "@ai-series/media",
  ],
};

export default nextConfig;
