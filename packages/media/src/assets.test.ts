import { describe, expect, it } from "bun:test";
import { canTransition } from "./assets";

describe("asset status transitions", () => {
  it("allows transitions from non-locked states", () => {
    expect(canTransition("draft", "approved")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(true);
    expect(canTransition("rejected", "approved")).toBe(true);
    expect(canTransition("draft", "locked")).toBe(true);
  });

  it("rejects transitions out of locked", () => {
    expect(canTransition("locked", "approved")).toBe(false);
    expect(canTransition("locked", "draft")).toBe(false);
  });

  it("rejects unknown target statuses", () => {
    expect(canTransition("draft", "bogus" as never)).toBe(false);
  });
});
