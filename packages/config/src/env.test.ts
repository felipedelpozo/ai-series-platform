import { describe, expect, it } from "bun:test";
import { EnvValidationError, loadEnv } from "./env";

describe("loadEnv", () => {
  it("returns defaults for a clean environment", () => {
    const cfg = loadEnv({});
    expect(cfg.appEnv).toBe("development");
    expect(cfg.nodeEnv).toBe("development");
    expect(cfg.workerPort).toBe(8787);
    expect(cfg.webPort).toBeUndefined();
    expect(cfg.subsystems.find((s) => s.id === "web")?.configured).toBe(true);
  });

  it("rejects an invalid APP_ENV", () => {
    expect(() => loadEnv({ APP_ENV: "invalid" })).toThrow(EnvValidationError);
  });

  it("rejects an out-of-range worker port", () => {
    expect(() => loadEnv({ WORKER_PORT: "99999" })).toThrow(EnvValidationError);
  });

  it("names the invalid variable without leaking secret values", () => {
    let caught: unknown;
    try {
      loadEnv({ DATABASE_URL: "postgres://user:supersecret@host/db", APP_ENV: "invalid" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(EnvValidationError);
    const message = (caught as Error).message;
    expect(message).toContain("APP_ENV");
    expect(message).not.toContain("supersecret");
  });

  it("marks optional subsystems as configured only when present", () => {
    const without = loadEnv({});
    expect(without.subsystems.find((s) => s.id === "database")?.configured).toBe(false);
    expect(without.subsystems.find((s) => s.id === "generation")?.configured).toBe(false);

    const withSecrets = loadEnv({ DATABASE_URL: "postgres://x", FAL_KEY: "k" });
    expect(withSecrets.subsystems.find((s) => s.id === "database")?.configured).toBe(true);
    expect(withSecrets.subsystems.find((s) => s.id === "generation")?.configured).toBe(true);
  });
});
