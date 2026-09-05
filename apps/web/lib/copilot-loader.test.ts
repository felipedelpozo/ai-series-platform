import { describe, expect, test } from "bun:test";
import { conversationValue, loadConversation, quoteValue } from "./copilot-loader";

describe("copilot client projection", () => {
  test("preserves the structured server scope on a real cost quote", () => {
    expect(
      quoteValue({
        id: "quote-1",
        quoteFingerprint: "quote-fingerprint",
        maximumAmount: "2.50",
        currency: "USD",
        availableQuota: "20",
        expiresAt: "2099-01-01T00:00:00.000Z",
        scope: {
          kind: "proposal_job",
          provider: "fal.ai",
          model: "flux-pro",
          purpose: "keyframe.generate",
          units: 4,
          targetRefs: ["shot:one", "shot:two"],
          executionDependency: "requires_application_receipt",
        },
      })?.scope,
    ).toEqual({
      kind: "proposal_job",
      provider: "fal.ai",
      model: "flux-pro",
      purpose: "keyframe.generate",
      units: 4,
      targetRefs: ["shot:one", "shot:two"],
      executionDependency: "requires_application_receipt",
    });
  });

  test("projects an approved revision as awaiting application even if storage reports awaiting approval", () => {
    const conversation = conversationValue({
      conversation: { id: "conversation-1", title: "Approved", status: "awaiting_approval" },
      context: { workspaceId: "workspace-1", role: "editor", fingerprint: "context" },
      revision: {
        id: "revision-1",
        proposalId: "proposal-1",
        revisionNumber: 1,
        fingerprint: "revision-fingerprint",
        payload: {},
        diff: [{}],
        validationStatus: "valid",
        decision: { id: "approval-1", kind: "approved" },
      },
    });

    expect(conversation.status).toBe("awaiting_application");
    expect(conversation.stateCause).toBe("Exact revision approved");
    expect(conversation.nextAction).toBe("Apply the approved revision.");
    expect(conversation.revision?.approvalId).toBe("approval-1");
  });

  test("a receipt has precedence over stale proposal status", () => {
    const conversation = conversationValue({
      conversation: { id: "conversation-1", status: "awaiting_approval" },
      context: { workspaceId: "workspace-1", role: "editor", fingerprint: "context" },
      receipt: { id: "receipt-1", committedAt: "2026-09-05T10:00:00.000Z", links: [] },
    });
    expect(conversation.status).toBe("applied");
  });

  test("loads every bounded history page without duplicating messages, proposals or revisions", async () => {
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    const messages = Array.from({ length: 205 }, (_, index) => ({
      id: `message-${index + 1}`,
      sequence: index + 1,
      role: index % 2 === 0 ? "user" : "assistant",
      classification: "proposal",
      content: `Message ${index + 1}`,
      createdAt: "2026-09-05T10:00:00.000Z",
    }));
    const pages = Array.from({ length: 5 }, (_, page) => ({
      conversation: {
        id: "conversation-history",
        title: "Long recovery",
        status: "continuity_conflict",
        stateCause: "Blocking continuity findings",
        nextAction: "Review the findings and revise the proposal.",
        retryable: false,
      },
      context: { workspaceId: "workspace-1", fingerprint: "context-1" },
      history: {
        messages: messages.slice(page * 50, (page + 1) * 50),
        proposals:
          page === 0
            ? [proposalHistory("proposal-2", [3, 2])]
            : page === 2
              ? [proposalHistory("proposal-1", [2, 1])]
              : [],
      },
      revision: revision("proposal-2", 3),
      timeline: messages.slice(page * 50, (page + 1) * 50).map((message) => ({
        id: `event-${message.sequence}`,
        sequence: message.sequence,
        type: "message.created",
        createdAt: message.createdAt,
      })),
      ...(page < 4 ? { nextCursor: `cursor-${page + 1}` } : {}),
    }));

    globalThis.fetch = (async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      const cursor = new URL(url, "http://localhost").searchParams.get("cursor");
      const page = cursor ? Number(cursor.split("-")[1]) : 0;
      return new Response(JSON.stringify(pages[page]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const conversation = await loadConversation("conversation-history");
      expect(conversation.messages).toHaveLength(205);
      expect(conversation.messages.at(0)?.content).toBe("Message 1");
      expect(conversation.messages.at(-1)?.content).toBe("Message 205");
      expect(conversation.timeline).toHaveLength(205);
      expect(conversation.proposals).toHaveLength(2);
      expect(conversation.revisions).toHaveLength(4);
      expect(conversation.status).toBe("continuity_conflict");
      expect(conversation.stateCause).toBe("Blocking continuity findings");
      expect(conversation.nextAction).toBe("Review the findings and revise the proposal.");
      expect(conversation.retryable).toBe(false);
      expect(requestedUrls).toHaveLength(5);
      expect(requestedUrls[0]).toEndWith("?limit=50");
      expect(requestedUrls[4]).toContain("cursor=cursor-4");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("stops recovery when the server repeats an opaque cursor", async () => {
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = (async () => {
      requests += 1;
      return new Response(
        JSON.stringify({
          conversation: { id: "conversation-loop", status: "recoverable_error" },
          context: { workspaceId: "workspace-1", fingerprint: "context-1" },
          history: { messages: [], proposals: [] },
          timeline: [],
          nextCursor: "same-cursor",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    try {
      await expect(loadConversation("conversation-loop")).rejects.toThrow("repeated cursor");
      expect(requests).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function proposalHistory(proposalId: string, revisions: number[]) {
  return {
    id: proposalId,
    status: "ready_for_review",
    revisions: revisions.map((number) => revision(proposalId, number)),
  };
}

function revision(proposalId: string, revisionNumber: number) {
  return {
    id: `${proposalId}-revision-${revisionNumber}`,
    proposalId,
    revisionNumber,
    fingerprint: `${proposalId}-${revisionNumber}`,
    payload: {},
    diff: [],
    findings: [],
    validationStatus: revisionNumber === 3 ? "invalid" : "valid",
  };
}
