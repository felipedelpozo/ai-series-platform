import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import type { Db } from "./client";
import * as schema from "./schema";

const TEST_DB = "ai_series_platform_copilot_test";
const migrationsFolder = join(import.meta.dirname, "..", "migrations");
const fingerprint = (character: string) => character.repeat(64);

function baseUrl(): string {
  return process.env.DATABASE_URL ?? "";
}

function databaseUrl(database: string): string {
  const url = new URL(baseUrl());
  url.pathname = `/${database}`;
  return url.toString();
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("copilot persistence integration", () => {
  let db: Db;
  let sql: ReturnType<typeof postgres>;
  let workspaceA: string;
  let workspaceB: string;
  let userId: string;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sql = postgres(databaseUrl(TEST_DB), { max: 6 });
    db = drizzle(sql, { schema });
    await migrate(db, { migrationsFolder });

    [userId] = (
      await db
        .insert(schema.users)
        .values({ email: "copilot-db@example.test", passwordHash: "test-only" })
        .returning({ id: schema.users.id })
    ).map((row) => row.id);
    [workspaceA, workspaceB] = (
      await db
        .insert(schema.workspace)
        .values([
          { name: "Copilot A", slug: "copilot-a" },
          { name: "Copilot B", slug: "copilot-b" },
        ])
        .returning({ id: schema.workspace.id })
    ).map((row) => row.id);
  });

  afterAll(async () => {
    await sql?.end();
  });

  async function createConversation(workspaceId: string, title: string) {
    const [row] = await db
      .insert(schema.copilotConversations)
      .values({ workspaceId, createdByUserId: userId, title })
      .returning();
    return row!;
  }

  async function createProposalChain(workspaceId: string, key: string) {
    const conversation = await createConversation(workspaceId, `Conversation ${key}`);
    const [context] = await db
      .insert(schema.copilotContextSnapshots)
      .values({
        conversationId: conversation.id,
        workspaceId,
        canonicalBases: [],
        fingerprint: fingerprint("a"),
        createdByUserId: userId,
      })
      .returning();
    const [proposal] = await db
      .insert(schema.copilotProposals)
      .values({
        conversationId: conversation.id,
        workspaceId,
        contextSnapshotId: context!.id,
        createdByUserId: userId,
        intent: "canonical_mutation",
        status: "ready_for_review",
      })
      .returning();
    const [revision] = await db
      .insert(schema.copilotProposalRevisions)
      .values({
        proposalId: proposal!.id,
        workspaceId,
        revisionNumber: 1,
        payload: { operations: [{ type: "series.create", name: key }] },
        canonicalBases: [],
        diff: [{ operation: "create", resource: "series" }],
        clientRevisionId: `revision-${key}`,
        contentFingerprint: fingerprint("b"),
        fingerprint: fingerprint("c"),
        validationStatus: "valid",
        createdByUserId: userId,
      })
      .returning();
    const [validation] = await db
      .insert(schema.copilotValidationRuns)
      .values({
        revisionId: revision!.id,
        workspaceId,
        revisionFingerprint: revision!.fingerprint,
        baseFingerprint: fingerprint("d"),
        status: "valid",
      })
      .returning();
    const [approval] = await db
      .insert(schema.copilotDecisions)
      .values({
        revisionId: revision!.id,
        validationRunId: validation!.id,
        workspaceId,
        actorUserId: userId,
        fingerprint: revision!.fingerprint,
        diffFingerprint: fingerprint("e"),
        baseFingerprint: validation!.baseFingerprint,
        kind: "approved",
      })
      .returning();
    const [application] = await db
      .insert(schema.copilotApplications)
      .values({
        approvalId: approval!.id,
        workspaceId,
        requestedByUserId: userId,
        idempotencyKey: `apply-${key}`,
        status: "applying",
        correlationId: `correlation-${key}`,
      })
      .returning();
    return {
      conversation,
      context: context!,
      proposal: proposal!,
      revision: revision!,
      approval: approval!,
      application: application!,
    };
  }

  it("migrates the complete copilot schema", async () => {
    const rows = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_name like 'copilot_%'
    `;
    expect(rows.map((row) => row.table_name)).toContain("copilot_inference_usage");
    expect(rows.map((row) => row.table_name)).toContain("copilot_rate_limit_buckets");
    expect(rows.map((row) => row.table_name)).toContain("copilot_application_receipts");
  });

  it("permits the same Series slug in different workspaces but not within one", async () => {
    await db.insert(schema.series).values([
      { workspaceId: workspaceA, name: "Shared A", slug: "shared" },
      { workspaceId: workspaceB, name: "Shared B", slug: "shared" },
    ]);
    await expect(
      Promise.resolve(
        db
          .insert(schema.series)
          .values({ workspaceId: workspaceA, name: "Duplicate", slug: "shared" }),
      ),
    ).rejects.toThrow();
  });

  it("rejects direct-SQL cross-workspace children through composite foreign keys", async () => {
    const conversation = await createConversation(workspaceA, "Tenant boundary");
    await expect(
      Promise.resolve(
        db.insert(schema.copilotContextSnapshots).values({
          conversationId: conversation.id,
          workspaceId: workspaceB,
          canonicalBases: [],
          fingerprint: fingerprint("f"),
          createdByUserId: userId,
        }),
      ),
    ).rejects.toThrow();

    await expect(
      Promise.resolve(
        db.insert(schema.copilotMessages).values({
          conversationId: conversation.id,
          workspaceId: workspaceB,
          sequence: 1,
          clientMessageId: "foreign-message",
          role: "user",
          classification: "query",
          content: "foreign tenant write",
          correlationId: "foreign-correlation",
        }),
      ),
    ).rejects.toThrow();
  });

  it("deduplicates client message and revision keys without overwriting history", async () => {
    const chain = await createProposalChain(workspaceA, "history");
    await db.insert(schema.copilotMessages).values({
      conversationId: chain.conversation.id,
      workspaceId: workspaceA,
      sequence: 1,
      clientMessageId: "message-history",
      role: "user",
      classification: "proposal",
      content: "Create a series",
      contextSnapshotId: chain.context.id,
      correlationId: "history-1",
    });
    await expect(
      Promise.resolve(
        db.insert(schema.copilotMessages).values({
          conversationId: chain.conversation.id,
          workspaceId: workspaceA,
          sequence: 2,
          clientMessageId: "message-history",
          role: "user",
          classification: "proposal",
          content: "Replay",
          contextSnapshotId: chain.context.id,
          correlationId: "history-2",
        }),
      ),
    ).rejects.toThrow();

    await db.insert(schema.copilotProposalRevisions).values({
      proposalId: chain.proposal.id,
      workspaceId: workspaceA,
      revisionNumber: 2,
      payload: { operations: [{ type: "series.create", name: "Restored" }] },
      canonicalBases: [],
      diff: [{ operation: "create", resource: "series" }],
      clientRevisionId: "revision-history-2",
      contentFingerprint: chain.revision.contentFingerprint,
      fingerprint: fingerprint("1"),
      validationStatus: "pending",
      createdByUserId: userId,
    });
    const revisions = await db
      .select()
      .from(schema.copilotProposalRevisions)
      .where(eq(schema.copilotProposalRevisions.proposalId, chain.proposal.id));
    expect(revisions).toHaveLength(2);
    expect(revisions.find((row) => row.revisionNumber === 1)?.payload).toEqual(
      chain.revision.payload,
    );

    await expect(
      Promise.resolve(
        db.insert(schema.copilotProposalRevisions).values({
          proposalId: chain.proposal.id,
          workspaceId: workspaceA,
          revisionNumber: 3,
          payload: { operations: [] },
          canonicalBases: [],
          diff: [],
          clientRevisionId: "revision-history-2",
          contentFingerprint: fingerprint("2"),
          fingerprint: fingerprint("3"),
          validationStatus: "pending",
          createdByUserId: userId,
        }),
      ),
    ).rejects.toThrow();
  });

  it("binds receipts to the exact approval revision", async () => {
    const chain = await createProposalChain(workspaceA, "exact");
    const [otherRevision] = await db
      .insert(schema.copilotProposalRevisions)
      .values({
        proposalId: chain.proposal.id,
        workspaceId: workspaceA,
        revisionNumber: 2,
        payload: { operations: [{ type: "series.create", name: "Other" }] },
        canonicalBases: [],
        diff: [{ operation: "create", resource: "series" }],
        clientRevisionId: "revision-exact-2",
        contentFingerprint: fingerprint("4"),
        fingerprint: fingerprint("5"),
        validationStatus: "valid",
        createdByUserId: userId,
      })
      .returning();
    await expect(
      Promise.resolve(
        db.insert(schema.copilotApplicationReceipts).values({
          applicationId: chain.application.id,
          approvalId: chain.approval.id,
          revisionId: otherRevision!.id,
          workspaceId: workspaceA,
          fingerprint: otherRevision!.fingerprint,
          actorUserId: userId,
          canonicalResults: [],
          correlationId: "exact-mismatch",
        }),
      ),
    ).rejects.toThrow();
  });

  it("keeps the current revision pointer inside its proposal and workspace", async () => {
    const first = await createProposalChain(workspaceA, "head-first");
    const second = await createProposalChain(workspaceA, "head-second");
    await db
      .update(schema.copilotProposals)
      .set({ currentRevisionId: first.revision.id })
      .where(eq(schema.copilotProposals.id, first.proposal.id));
    await expect(
      Promise.resolve(
        db
          .update(schema.copilotProposals)
          .set({ currentRevisionId: second.revision.id })
          .where(eq(schema.copilotProposals.id, first.proposal.id)),
      ),
    ).rejects.toThrow();
  });

  it("allows only one receipt under concurrent completion", async () => {
    const chain = await createProposalChain(workspaceA, "concurrent");
    const receipt = {
      applicationId: chain.application.id,
      approvalId: chain.approval.id,
      revisionId: chain.revision.id,
      workspaceId: workspaceA,
      fingerprint: chain.revision.fingerprint,
      actorUserId: userId,
      canonicalResults: [{ type: "series", id: "result" }],
      correlationId: "concurrent-receipt",
    };
    const results = await Promise.allSettled([
      db.insert(schema.copilotApplicationReceipts).values(receipt),
      db.insert(schema.copilotApplicationReceipts).values(receipt),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const stored = await db
      .select()
      .from(schema.copilotApplicationReceipts)
      .where(eq(schema.copilotApplicationReceipts.applicationId, chain.application.id));
    expect(stored).toHaveLength(1);
  });

  it("documents that the workspace slug migration has a forward-only rollback after use", async () => {
    await db.insert(schema.series).values([
      { workspaceId: workspaceA, name: "Rollback A", slug: "rollback-shared" },
      { workspaceId: workspaceB, name: "Rollback B", slug: "rollback-shared" },
    ]);
    const rows = await db
      .select()
      .from(schema.series)
      .where(eq(schema.series.slug, "rollback-shared"));
    expect(rows).toHaveLength(2);
    const constraints = await sql<{ constraint_name: string }[]>`
      select constraint_name
      from information_schema.table_constraints
      where table_schema = 'public' and table_name = 'series' and constraint_type = 'UNIQUE'
    `;
    expect(constraints.map((row) => row.constraint_name)).not.toContain("series_slug_unique");
  });
});
