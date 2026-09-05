import { describe, expect, it } from "bun:test";
import { readOptionalJsonBody } from "./request-body";

describe("readOptionalJsonBody", () => {
  it("preserves backwards-compatible empty request bodies", async () => {
    expect(await readOptionalJsonBody(new Request("http://localhost", { method: "POST" }))).toEqual(
      {},
    );
  });

  it("parses valid JSON", async () => {
    const request = new Request("http://localhost", { method: "POST", body: '{"details":"x"}' });
    expect(await readOptionalJsonBody(request)).toEqual({ details: "x" });
  });

  it("rejects malformed JSON instead of silently using defaults", async () => {
    const request = new Request("http://localhost", { method: "POST", body: "{" });
    expect(readOptionalJsonBody(request)).rejects.toThrow("Invalid JSON body");
  });
});
