import { loadEnv, type AppEnvConfig, type SubsystemStatus } from "@ai-series/config";

export function healthResponse(
  subsystems: SubsystemStatus[],
  now: Date = new Date(),
): Response {
  return Response.json({
    status: "ok",
    service: "ai-series-worker",
    subsystems,
    timestamp: now.toISOString(),
  });
}

export function startServer(port: number, subsystems: SubsystemStatus[]) {
  return Bun.serve({
    port,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/health") {
        return healthResponse(subsystems);
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
