import { describe, expect, it } from "bun:test";
import { classifyIntent } from "@ai-series/copilot";
import { CopilotApiError, requireString } from "../../app/api/copilot/_lib/http";
import { GET, POST } from "../../app/api/copilot/conversations/route";
import { POST as postMessage } from "../../app/api/copilot/conversations/[conversationId]/messages/route";
import { POST as postRevision } from "../../app/api/copilot/proposals/[proposalId]/revisions/route";
import { POST as validate } from "../../app/api/copilot/proposals/[proposalId]/validate/route";
import { POST as decide } from "../../app/api/copilot/proposals/[proposalId]/decision/route";
import { POST as apply } from "../../app/api/copilot/proposals/[proposalId]/apply/route";

describe("Feature 029 series API contract", () => {
  it("exports the complete explicit conversation-to-application command surface", () => {
    for (const handler of [GET, POST, postMessage, postRevision, validate, decide, apply]) {
      expect(typeof handler).toBe("function");
    }
  });

  it("does not interpret conversational consent as an approval command", () => {
    expect(classifyIntent("Adelante con la serie")).toBe("query");
    expect(classifyIntent("Adelante con la serie")).not.toBe("paid_job");
  });

  it("rejects missing, oversized and malformed command identifiers", () => {
    expect(() => requireString(undefined, "revisionId", { uuid: true })).toThrow(CopilotApiError);
    expect(() => requireString("x".repeat(201), "clientRevisionId", { max: 200 })).toThrow(
      CopilotApiError,
    );
    expect(() => requireString("foreign-id", "revisionId", { uuid: true })).toThrow(
      CopilotApiError,
    );
  });
});
