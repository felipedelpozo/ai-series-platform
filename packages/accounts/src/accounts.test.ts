import { describe, expect, it } from "bun:test";
import { canRole, hashPassword, verifyPassword, ROLE_RANK } from "./accounts";

describe("password hashing", () => {
  it("round-trips a correct password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).toContain(":");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("right");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});

describe("role ordering", () => {
  it("orders roles by authority", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.editor);
    expect(ROLE_RANK.editor).toBeGreaterThan(ROLE_RANK.viewer);
  });

  it("allows equal or higher roles", () => {
    expect(canRole("owner", "editor")).toBe(true);
    expect(canRole("editor", "editor")).toBe(true);
    expect(canRole("viewer", "editor")).toBe(false);
    expect(canRole("viewer", "viewer")).toBe(true);
  });
});
