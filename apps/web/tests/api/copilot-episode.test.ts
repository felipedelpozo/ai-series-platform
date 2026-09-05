import { describe, expect, it } from "bun:test";
import { ProposalPayloadSchema } from "@ai-series/copilot";
import { POST as postRevision } from "../../app/api/copilot/proposals/[proposalId]/revisions/route";
import { POST as apply } from "../../app/api/copilot/proposals/[proposalId]/apply/route";

describe("Feature 029 episode API contract", () => {
  it("exposes revision and atomic apply commands for episode drafts", () => {
    expect(typeof postRevision).toBe("function");
    expect(typeof apply).toBe("function");
  });

  it("rejects a screenplay change without ordered scenes", () => {
    const result = ProposalPayloadSchema.safeParse({
      schemaVersion: 1,
      operations: [
        { type: "scene_set.replace_with_revision", planId: crypto.randomUUID(), scenes: [] },
      ],
    });
    expect(result.success).toBe(false);
  });
});
