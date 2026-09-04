import { describe, expect, it } from "bun:test";
import { checkDuplicateShots, checkEmptyOutput, checkMissingCliffhanger } from "./checks";

describe("qa deterministic checks", () => {
  it("detects duplicate shots", () => {
    const findings = checkDuplicateShots([
      { id: "a", data: { type: "close-up", subject: "Rin" } },
      { id: "b", data: { type: "close-up", subject: "Rin" } },
    ]);
    expect(findings.length).toBe(1);
    expect(findings[0]!.check).toBe("duplicate-shot");
  });

  it("detects missing cliffhanger", () => {
    expect(checkMissingCliffhanger({ data: {} }).length).toBe(1);
    expect(checkMissingCliffhanger({ data: { cliffhanger: "x" } }).length).toBe(0);
  });

  it("detects empty output", () => {
    const findings = checkEmptyOutput([{ id: "a" }, { id: "b" }], new Set(["a"]));
    expect(findings.length).toBe(1);
    expect(findings[0]!.shotId).toBe("b");
  });
});
