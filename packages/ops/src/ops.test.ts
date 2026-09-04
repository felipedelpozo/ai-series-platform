import { describe, expect, it } from "bun:test";
import { estimateCost, isJobStuck } from "./ops";

describe("estimateCost", () => {
  it("estimates a base image cost", () => {
    expect(estimateCost("image")).toBe(0.01);
  });

  it("estimates a higher video cost", () => {
    expect(estimateCost("video")).toBe(0.05);
  });

  it("multiplies for premium models", () => {
    expect(estimateCost("video", "h3-max")).toBe(0.1);
    expect(estimateCost("image", "some-large-model")).toBe(0.02);
  });
});

describe("isJobStuck", () => {
  it("flags running jobs older than the threshold", () => {
    const now = Date.now();
    const stale = new Date(now - 11 * 60 * 1000);
    expect(isJobStuck({ status: "running", updatedAt: stale, attemptCount: 0, maxAttempts: 3 }, now)).toBe(true);
    expect(isJobStuck({ status: "running", updatedAt: new Date(now - 1000), attemptCount: 0, maxAttempts: 3 }, now)).toBe(false);
  });

  it("flags queued jobs with exhausted attempts", () => {
    expect(isJobStuck({ status: "queued", updatedAt: new Date(), attemptCount: 3, maxAttempts: 3 }, Date.now())).toBe(true);
    expect(isJobStuck({ status: "queued", updatedAt: new Date(), attemptCount: 1, maxAttempts: 3 }, Date.now())).toBe(false);
  });

  it("never flags terminal jobs as stuck", () => {
    for (const status of ["succeeded", "failed", "cancelled"]) {
      expect(isJobStuck({ status, updatedAt: new Date(0), attemptCount: 9, maxAttempts: 3 })).toBe(false);
    }
  });
});
