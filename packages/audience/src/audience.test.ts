import { describe, expect, it } from "bun:test";
import { detectSpam } from "./audience";

describe("audience spam detection", () => {
  it("flags empty comments as spam", () => {
    expect(detectSpam({ comment: "" })).toBe(true);
  });

  it("flags comments with links as spam", () => {
    expect(detectSpam({ comment: "check http://spam.com" })).toBe(true);
  });

  it("accepts normal comments", () => {
    expect(detectSpam({ comment: "me gusta la opción A" })).toBe(false);
  });

  it("accepts explicit option votes without free text", () => {
    expect(detectSpam({ metadata: { optionLabel: "A" } })).toBe(false);
    expect(detectSpam({ metadata: { optionId: "opt-1" } })).toBe(false);
  });
});
