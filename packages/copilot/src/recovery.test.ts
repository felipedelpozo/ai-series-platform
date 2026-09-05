import { describe, expect, test } from "bun:test";
import {
  deriveRecoveryState,
  projectConversationForRecovery,
  reconcileConversationEffects,
} from "./recovery";
import {
  appendIdempotentMessage,
  appendIdempotentRevision,
  type ConversationPersistence,
  type ConversationPersistenceTransaction,
  type StoredMessage,
  type StoredRevision,
} from "./repository";

describe("copilot recovery", () => {
  test("replays exact client message and revision keys but rejects changed payloads", async () => {
    let message: StoredMessage | null = null;
    let revision: StoredRevision | null = null;
    const tx: ConversationPersistenceTransaction = {
      lockConversation: async () => ({ id: "conversation-1" }),
      findMessageByClientKey: async () => message,
      insertMessage: async (input) =>
        (message = { ...input, id: "message-1", sequence: 1, createdAt: "2026-09-05T10:00:00Z" }),
      findRevisionByClientKey: async <TPayload>() => revision as StoredRevision<TPayload> | null,
      getCurrentRevision: async <TPayload>() => revision as StoredRevision<TPayload> | null,
      insertRevision: async <TPayload>(
        input: Omit<StoredRevision<TPayload>, "id" | "revisionNumber" | "createdAt">,
      ) =>
        (revision = {
          ...input,
          id: "revision-1",
          revisionNumber: 1,
          createdAt: "2026-09-05T10:00:00Z",
        }) as StoredRevision<TPayload>,
    };
    const persistence = {
      transaction: async <T>(callback: (inner: ConversationPersistenceTransaction) => Promise<T>) =>
        callback(tx),
      pageConversation: async () => null,
    } satisfies ConversationPersistence;
    const messageInput = {
      conversationId: "conversation-1",
      workspaceId: "workspace-1",
      actorUserId: "user-1",
      role: "user" as const,
      content: "Draft it",
      clientMessageId: "client-message-1",
    };
    expect(await appendIdempotentMessage(persistence, messageInput)).toMatchObject({
      ok: true,
      replayed: false,
    });
    expect(await appendIdempotentMessage(persistence, messageInput)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(
      await appendIdempotentMessage(persistence, { ...messageInput, content: "Different" }),
    ).toMatchObject({ ok: false, code: "idempotency_conflict" });

    const revisionInput = {
      proposalId: "proposal-1",
      workspaceId: "workspace-1",
      clientRevisionId: "client-revision-1",
      basedOnRevisionId: undefined,
      fingerprint: "revision-fingerprint",
      contentFingerprint: "content-fingerprint",
      payload: { name: "One" },
    };
    expect(await appendIdempotentRevision(persistence, revisionInput)).toMatchObject({
      ok: true,
      replayed: false,
    });
    expect(await appendIdempotentRevision(persistence, revisionInput)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(
      await appendIdempotentRevision(persistence, { ...revisionInput, fingerprint: "changed" }),
    ).toMatchObject({ ok: false, code: "idempotency_conflict" });
  });

  test("orders late responses by server sequence and bounds projection", () => {
    const projection = projectConversationForRecovery(
      {
        conversation: {},
        proposals: [],
        effects: [],
        messages: [
          {
            id: "2",
            conversationId: "c",
            workspaceId: "w",
            role: "assistant",
            content: "late",
            sequence: 2,
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "1",
            conversationId: "c",
            workspaceId: "w",
            role: "user",
            content: "first",
            sequence: 1,
            createdAt: "2026-01-01T00:00:01Z",
          },
        ],
      },
      1,
    );
    expect(projection.messages.map((message) => message.id)).toEqual(["2"]);
  });

  test("derives safe causes and next actions", () => {
    expect(deriveRecoveryState({ validationStatus: "valid_with_warnings" })).toMatchObject({
      status: "awaiting_approval",
      nextAction: "approve",
    });
    expect(deriveRecoveryState({ validationStatus: "stale" })).toMatchObject({
      status: "stale_draft",
      nextAction: "review",
    });
    expect(deriveRecoveryState({ failure: { code: "timeout", retryable: true } })).toMatchObject({
      status: "recoverable_error",
      nextAction: "retry",
    });
  });

  test("reconciles an uncertain commit and job instead of duplicating either", async () => {
    const result = await reconcileConversationEffects(
      {
        findApplicationReceipt: async () => ({
          id: "receipt-1",
          applicationId: "application-1",
          approvalId: "approval-1",
          revisionId: "revision-1",
          workspaceId: "workspace-1",
          actorUserId: "user-1",
          revisionFingerprint: "fingerprint",
          correlationId: "correlation-1",
          results: [],
          committedAt: "2026-09-05T10:00:00Z",
        }),
        findPaidJob: async () => ({ id: "job-1", status: "succeeded", href: "/ops?jobId=job-1" }),
      },
      {
        workspaceId: "workspace-1",
        applicationIdempotencyKey: "apply-1",
        jobIdempotencyKey: "job-key-1",
      },
    );
    expect(result.receipt?.id).toBe("receipt-1");
    expect(result.job).toMatchObject({ id: "job-1", status: "succeeded" });
  });
});
