import { describe, expect, it } from "bun:test";

function nextPromptVersion(current: number, status: string): number {
  return status === "stopped" ? current : current + 1;
}

describe("director prompt versioning", () => {
  it("increments version while streaming", () => {
    expect(nextPromptVersion(1, "streaming")).toBe(2);
    expect(nextPromptVersion(2, "idle")).toBe(3);
  });

  it("does not increment a stopped session", () => {
    expect(nextPromptVersion(3, "stopped")).toBe(3);
  });
});
