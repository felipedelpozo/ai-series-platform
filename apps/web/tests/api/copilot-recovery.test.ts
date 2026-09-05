import { describe, expect, it } from "bun:test";
import { copilotErrorResponse, copilotJson } from "../../lib/copilot-api";
import { GET as getConversation } from "../../app/api/copilot/conversations/[conversationId]/route";
import { GET as listConversations } from "../../app/api/copilot/conversations/route";
import {
  decodeConversationCursor,
  encodeConversationCursor,
} from "../../app/api/copilot/_lib/store";

describe("Feature 029 recovery API contract", () => {
  it("exposes list and detail reads for reload-safe reconstruction", () => {
    expect(typeof listConversations).toBe("function");
    expect(typeof getConversation).toBe("function");
  });

  it("returns correlation evidence without leaking unknown failure details", async () => {
    const success = copilotJson({ status: "applied" }, "correlation-1");
    expect(await success.json()).toEqual({ status: "applied", correlationId: "correlation-1" });

    const failure = copilotErrorResponse(new Error("secret-provider-token"), "correlation-2");
    const payload = await failure.text();
    expect(payload).toContain("correlation-2");
    expect(payload).not.toContain("secret-provider-token");
  });

  it("uses an opaque stable cursor for chronological event pagination", () => {
    const cursor = encodeConversationCursor({ sequence: 42 });
    expect(cursor).not.toContain("42");
    expect(decodeConversationCursor(cursor)).toEqual({ sequence: 42 });
    expect(() => decodeConversationCursor("not-a-valid-cursor")).toThrow("cursor is invalid");
  });
});
