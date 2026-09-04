import { config } from "dotenv";
import { join } from "node:path";
import type { NextConfig } from "next";

config({ path: join(process.cwd(), "..", "..", ".env") });

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ai-series/config",
    "@ai-series/ui",
    "@ai-series/db",
    "@ai-series/entities",
    "@ai-series/series",
    "@ai-series/story",
    "@ai-series/planner",
    "@ai-series/production",
    "@ai-series/director",
    "@ai-series/comfy",
    "@ai-series/qa",
    "@ai-series/audio",
    "@ai-series/composition",
    "@ai-series/audience",
    "@ai-series/ai",
    "@ai-series/prompts",
    "@ai-series/fal",
    "@ai-series/generation",
    "@ai-series/jobs",
    "@ai-series/media",
  ],
};

export default nextConfig;
