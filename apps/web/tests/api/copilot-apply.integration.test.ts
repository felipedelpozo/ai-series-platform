import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { schema } from "@ai-series/db";
import { applyRevision, projectConversation } from "../../app/api/copilot/_lib/store";
import {
  bible,
  character,
  createRuntimeHarness,
  hasDatabase,
  location,
  prop,
  type RuntimeHarness,
} from "./copilot-runtime-integration-helpers";

describe.skipIf(!hasDatabase)("copilot PostgreSQL series application", () => {
  let harness: RuntimeHarness;

  beforeAll(async () => {
    harness = await createRuntimeHarness("ai_series_copilot_apply_test");
  });

  afterAll(async () => {
    await harness?.close();
  });

  it("applies a complete series bundle once across ten concurrent replays", async () => {
    const { workspace, user } = await harness.actor("apply-bundle");
    const chain = await harness.proposal({
      workspaceId: workspace.id,
      actorUserId: user.id,
      payload: {
        schemaVersion: 1,
        operations: [
          { type: "series.create", clientRef: "series", name: "Night City", slug: "night-city" },
          { type: "bible.append", seriesRef: "series", data: bible },
          {
            type: "entity.create",
            clientRef: "rin",
            seriesRef: "series",
            entityType: "character",
            name: "Rin",
            data: character,
          },
          {
            type: "entity.create",
            clientRef: "station",
            seriesRef: "series",
            entityType: "location",
            name: "Station",
            data: location,
          },
          {
            type: "entity.create",
            clientRef: "key",
            seriesRef: "series",
            entityType: "prop",
            name: "Key",
            data: prop,
          },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: workspace.id,
      actorUserId: user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        applyRevision(harness.db, {
          workspaceId: workspace.id,
          actorUserId: user.id,
          proposalId: chain.proposal.id,
          approvalId: decision.id,
          idempotencyKey: `tab-${index}`,
          correlationId: `apply-${index}`,
        }),
      ),
    );

    expect(new Set(results.map(({ receipt }) => receipt.id)).size).toBe(1);
    expect(results.filter(({ replayed }) => !replayed)).toHaveLength(1);
    const seriesRows = await harness.db
      .select()
      .from(schema.series)
      .where(
        and(eq(schema.series.workspaceId, workspace.id), eq(schema.series.slug, "night-city")),
      );
    expect(seriesRows).toHaveLength(1);
    expect(
      await harness.db
        .select()
        .from(schema.seriesBibles)
        .where(eq(schema.seriesBibles.seriesId, seriesRows[0]!.id)),
    ).toHaveLength(1);
    expect(
      await harness.db
        .select()
        .from(schema.entities)
        .where(eq(schema.entities.seriesId, seriesRows[0]!.id)),
    ).toHaveLength(3);
    expect(
      await harness.db
        .select()
        .from(schema.copilotApplicationReceipts)
        .where(eq(schema.copilotApplicationReceipts.approvalId, decision.id)),
    ).toHaveLength(1);
    expect(
      await harness.db
        .select()
        .from(schema.copilotRevisionTargets)
        .where(eq(schema.copilotRevisionTargets.revisionId, chain.revision.id)),
    ).toHaveLength(4);

    const firstPage = await projectConversation(harness.db, workspace.id, chain.conversation.id, {
      limit: 2,
    });
    expect(firstPage?.timeline).toHaveLength(2);
    expect(firstPage?.nextCursor).toBeString();
    const secondPage = await projectConversation(harness.db, workspace.id, chain.conversation.id, {
      limit: 100,
      cursor: firstPage!.nextCursor,
    });
    const timeline = [...firstPage!.timeline, ...secondPage!.timeline];
    expect(timeline.map(({ sequence }) => sequence)).toEqual(
      timeline.map(({ sequence }) => sequence).toSorted((left, right) => left - right),
    );
    expect(timeline.map(({ type }) => type)).toContain("receipt.committed");
    expect(firstPage?.reconciliation.receipt?.id).toBe(results[0]!.receipt.id);
  });

  it("rolls back every canonical row when a later operation fails", async () => {
    const { workspace, user } = await harness.actor("apply-rollback");
    const chain = await harness.proposal({
      workspaceId: workspace.id,
      actorUserId: user.id,
      payload: {
        schemaVersion: 1,
        operations: [
          { type: "series.create", clientRef: "one", name: "One", slug: "collision" },
          { type: "series.create", clientRef: "two", name: "Two", slug: "collision" },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: workspace.id,
      actorUserId: user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });

    await expect(
      applyRevision(harness.db, {
        workspaceId: workspace.id,
        actorUserId: user.id,
        proposalId: chain.proposal.id,
        approvalId: decision.id,
        idempotencyKey: "rollback",
        correlationId: "rollback",
      }),
    ).rejects.toThrow();

    expect(
      await harness.db
        .select()
        .from(schema.series)
        .where(eq(schema.series.workspaceId, workspace.id)),
    ).toHaveLength(0);
    expect(
      await harness.db
        .select()
        .from(schema.copilotApplications)
        .where(eq(schema.copilotApplications.approvalId, decision.id)),
    ).toHaveLength(0);
  });

  it("reconstructs more than 200 messages and multiple proposals through one cursor", async () => {
    const { workspace, user } = await harness.actor("recovery-pages");
    const chain = await harness.proposal({
      workspaceId: workspace.id,
      actorUserId: user.id,
      payload: {
        schemaVersion: 1,
        operations: [
          { type: "series.create", clientRef: "series", name: "Recovery", slug: "recovery" },
        ],
      },
    });
    const [context] = await harness.db
      .select()
      .from(schema.copilotContextSnapshots)
      .where(eq(schema.copilotContextSnapshots.conversationId, chain.conversation.id))
      .limit(1);
    await harness.db.insert(schema.copilotMessages).values(
      Array.from({ length: 205 }, (_, index) => ({
        conversationId: chain.conversation.id,
        workspaceId: workspace.id,
        sequence: index + 1,
        clientMessageId: `recovery-message-${index + 1}`,
        role: "user",
        classification: "query",
        content: `Message ${index + 1}`,
        contextSnapshotId: context!.id,
        correlationId: `recovery-${index + 1}`,
      })),
    );
    await harness.db.insert(schema.copilotProposals).values(
      [2, 3].map((ordinal) => ({
        conversationId: chain.conversation.id,
        workspaceId: workspace.id,
        contextSnapshotId: context!.id,
        createdByUserId: user.id,
        intent: "canonical_mutation",
        status: "ready_for_review",
        createdAt: new Date(`2026-09-05T00:00:0${ordinal}.000Z`),
      })),
    );

    const messageIds = new Set<string>();
    const proposalIds = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await projectConversation(harness.db, workspace.id, chain.conversation.id, {
        limit: 50,
        cursor,
      });
      page!.history.messages.forEach((message) => messageIds.add(message.id));
      page!.history.proposals.forEach((proposal) => proposalIds.add(proposal.id));
      cursor = page!.nextCursor;
    } while (cursor);

    expect(messageIds.size).toBe(205);
    expect(proposalIds.size).toBe(3);
  });
});
