import { describe, expect, it } from "bun:test";
import { shouldRetry } from "./jobs";

describe("job retry policy", () => {
  it("retries recoverable errors within the limit", () => {
    expect(shouldRetry(true, 1, 3)).toBe(true);
    expect(shouldRetry(true, 2, 3)).toBe(true);
    expect(shouldRetry(true, 3, 3)).toBe(false);
  });

  it("does not retry non-recoverable errors", () => {
    expect(shouldRetry(false, 0, 3)).toBe(false);
  });
});
