import { describe, expect, it } from "bun:test";
import { isDiagnosticsEnabled } from "./diagnostics";

describe("isDiagnosticsEnabled", () => {
  it("enables diagnostics only in development", () => {
    expect(isDiagnosticsEnabled("development")).toBe(true);
    expect(isDiagnosticsEnabled("test")).toBe(false);
    expect(isDiagnosticsEnabled("production")).toBe(false);
    expect(isDiagnosticsEnabled(undefined)).toBe(false);
  });
});
