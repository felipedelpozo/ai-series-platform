import { createHash } from "node:crypto";

export type CanonicalJson =
  null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson };

function canonicalizeValue(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new TypeError("Canonical JSON cannot contain non-finite numbers");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== "object") {
    throw new TypeError(`Canonical JSON cannot contain ${typeof value}`);
  }

  if (ancestors.has(value)) throw new TypeError("Canonical JSON cannot contain cycles");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => canonicalizeValue(item, ancestors)).join(",")}]`;
    }
    if (
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    ) {
      throw new TypeError("Canonical JSON only accepts plain objects");
    }
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeValue(object[key], ancestors)}`)
      .join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalJson(value: unknown): string {
  return canonicalizeValue(value, new Set());
}

export function sha256Fingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function createContentFingerprint(payload: unknown): string {
  return sha256Fingerprint({ kind: "copilot-content", payload });
}

export function createRevisionFingerprint(input: {
  proposalId: string;
  revisionId: string;
  revisionNumber: number;
  contentFingerprint: string;
  baseFingerprint: string;
  diffFingerprint: string;
}): string {
  return sha256Fingerprint({ kind: "copilot-revision", ...input });
}

export function createBaseFingerprint(canonicalBases: unknown): string {
  return sha256Fingerprint({ kind: "copilot-base", canonicalBases });
}

export function createDiffFingerprint(diff: unknown): string {
  return sha256Fingerprint({ kind: "copilot-diff", diff });
}

export function createScopeFingerprint(scope: unknown): string {
  return sha256Fingerprint({ kind: "copilot-scope", scope });
}

export function createWorkspaceIntentKey(input: {
  workspaceId: string;
  actorUserId: string;
  operation: string;
  intent: unknown;
}): string {
  return `copilot:${input.workspaceId}:${sha256Fingerprint({
    kind: "copilot-intent",
    actorUserId: input.actorUserId,
    operation: input.operation,
    intent: input.intent,
  })}`;
}
