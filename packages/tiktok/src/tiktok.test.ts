import { describe, expect, it } from "bun:test";
import { backoffMs, getCapabilities, withRetry } from "./tiktok";

describe("capability gating", () => {
  it("exposes manual capabilities as connected in manual mode", () => {
    const caps = getCapabilities();
    expect(caps.find((c) => c.id === "video.associate")?.connected).toBe(true);
    expect(caps.find((c) => c.id === "video.associate")?.mode).toBe("manual");
    expect(caps.find((c) => c.id === "engagement.import")?.connected).toBe(true);
  });

  it("marks API-only capabilities as unavailable without credentials", () => {
    const caps = getCapabilities();
    for (const id of ["account.link", "episode.publish", "window.automate"]) {
      const cap = caps.find((c) => c.id === id);
      expect(cap?.connected).toBe(false);
      expect(cap?.mode).toBe("unavailable");
    }
  });
});

describe("backoff and retry", () => {
  it("computes exponential backoff capped at 60s", () => {
    expect(backoffMs(1, 1000)).toBe(1000);
    expect(backoffMs(2, 1000)).toBe(2000);
    expect(backoffMs(3, 1000)).toBe(4000);
    expect(backoffMs(99, 1000)).toBe(60_000);
  });

  it("retries recoverable errors and succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { maxAttempts: 3, baseMs: 1 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry non-recoverable errors", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("fatal");
        },
        { maxAttempts: 3, baseMs: 1, shouldRetry: () => false },
      ),
    ).rejects.toThrow("fatal");
    expect(calls).toBe(1);
  });
});
