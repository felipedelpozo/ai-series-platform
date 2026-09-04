import { describe, expect, it } from "bun:test";
import { loadEnv } from "@ai-series/config";
import { healthResponse, startServer } from "./index";

describe("worker health", () => {
  it("returns the health contract without secrets", async () => {
    const env = loadEnv({});
    const response = healthResponse(env.subsystems, new Date("2026-09-04T00:00:00.000Z"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.service).toBe("ai-series-worker");
    expect(body.timestamp).toBe("2026-09-04T00:00:00.000Z");
    expect(Array.isArray(body.subsystems)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("supersecret");
  });

  it("serves /health over HTTP", async () => {
    const env = loadEnv({});
    const server = startServer(0, env.subsystems);
    try {
      const response = await fetch(`http://localhost:${server.port}/health`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe("ok");
    } finally {
      server.stop(true);
    }
  });
});
