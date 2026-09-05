import { describe, expect, test } from "bun:test";
import {
  canonicalJson,
  createBaseFingerprint,
  createContentFingerprint,
  createDiffFingerprint,
  createRevisionFingerprint,
  createScopeFingerprint,
  createWorkspaceIntentKey,
  sha256Fingerprint,
} from "./fingerprint";

describe("canonical fingerprints", () => {
  test("sorts object keys recursively while preserving array order", () => {
    expect(canonicalJson({ z: 1, nested: { b: true, a: null }, list: [2, 1] })).toBe(
      '{"list":[2,1],"nested":{"a":null,"b":true},"z":1}',
    );
    expect(sha256Fingerprint({ b: 2, a: 1 })).toBe(sha256Fingerprint({ a: 1, b: 2 }));
    expect(sha256Fingerprint([1, 2])).not.toBe(sha256Fingerprint([2, 1]));
  });

  test("rejects values outside JSON instead of silently changing authority", () => {
    expect(() => canonicalJson({ value: undefined })).toThrow("undefined");
    expect(() => canonicalJson(Number.NaN)).toThrow("non-finite");
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => canonicalJson(cycle)).toThrow("cycles");
  });

  test("binds each fingerprint to its purpose", () => {
    const value = { id: "same" };
    expect(createContentFingerprint(value)).not.toBe(createBaseFingerprint(value));
    expect(createBaseFingerprint(value)).not.toBe(createDiffFingerprint(value));
    expect(createDiffFingerprint(value)).not.toBe(createScopeFingerprint(value));
  });

  test("binds exact revision identity even when content is restored", () => {
    const common = {
      proposalId: "proposal",
      revisionNumber: 1,
      contentFingerprint: createContentFingerprint({ title: "Pilot" }),
      baseFingerprint: createBaseFingerprint([]),
      diffFingerprint: createDiffFingerprint([{ op: "create" }]),
    };
    const first = createRevisionFingerprint({ ...common, revisionId: "revision-1" });
    const second = createRevisionFingerprint({ ...common, revisionId: "revision-2" });
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test("derives stable tenant- and actor-bound intent keys", () => {
    const input = {
      workspaceId: "workspace-a",
      actorUserId: "user-a",
      operation: "paid.start",
      intent: { provider: "fal", units: 2 },
    };
    expect(createWorkspaceIntentKey(input)).toBe(createWorkspaceIntentKey(input));
    expect(createWorkspaceIntentKey(input)).not.toBe(
      createWorkspaceIntentKey({ ...input, workspaceId: "workspace-b" }),
    );
    expect(createWorkspaceIntentKey(input)).not.toBe(
      createWorkspaceIntentKey({ ...input, actorUserId: "user-b" }),
    );
  });
});
