import { config } from "dotenv";
import { join } from "node:path";
import { loadEnv, type AppEnvConfig, type SubsystemStatus } from "@ai-series/config";
import { checkDb, type DbHealth } from "@ai-series/db";

config({ path: join(process.cwd(), "..", "..", ".env") });

export function healthResponse(
  subsystems: SubsystemStatus[],
  now: Date = new Date(),
  database?: DbHealth,
): Response {
  return Response.json({
    status: "ok",
    service: "ai-series-worker",
    subsystems,
    database: database ?? null,
    timestamp: now.toISOString(),
  });
}

export function startServer(port: number, subsystems: SubsystemStatus[]) {
  return Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        const database = await checkDb();
        return healthResponse(subsystems, undefined, database);
      }
      return new Response("Not found", { status: 404 });
    },
  });
}

export function run(env: AppEnvConfig): void {
  const server = startServer(env.workerPort, env.subsystems);
  console.log(`[worker] listening on http://localhost:${server.port}`);
}

if (import.meta.main) {
  run(loadEnv());
}
