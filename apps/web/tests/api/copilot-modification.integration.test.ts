import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { schema } from "@ai-series/db";
import type { CanonicalBase } from "@ai-series/copilot";
import { applyRevision, validateRevision } from "../../app/api/copilot/_lib/store";
import {
  bible,
  character,
  createRuntimeHarness,
  hasDatabase,
  type RuntimeHarness,
} from "./copilot-runtime-integration-helpers";

describe.skipIf(!hasDatabase)("copilot PostgreSQL canonical modifications", () => {
  let harness: RuntimeHarness;
  beforeAll(async () => {
    harness = await createRuntimeHarness("ai_series_copilot_modify_test");
  });
  afterAll(async () => {
    await harness?.close();
  });

  async function fixture(slug: string) {
    const { workspace, user } = await harness.actor(slug);
    const [series] = await harness.db
      .insert(schema.series)
      .values({ workspaceId: workspace.id, name: "Original", slug })
      .returning();
    await harness.db
      .insert(schema.seriesBibles)
      .values({ seriesId: series!.id, version: 1, ...bible, isActive: true });
    const [entity] = await harness.db
      .insert(schema.entities)
      .values({ seriesId: series!.id, type: "character", name: "Rin" })
      .returning();
    const [version] = await harness.db
      .insert(schema.entityVersions)
      .values({ entityId: entity!.id, version: 1, name: "Rin", data: character, isActive: true })
      .returning();
    return { workspace, user, series: series!, entity: entity!, version: version! };
  }

  it("applies exact-base rename, entity revision and archive as one change set", async () => {
    const item = await fixture("modify-success");
    const seed = await harness.proposal({
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      seriesId: item.series.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "series.rename",
            targetId: item.series.id,
            name: "Renamed",
            base: {
              resourceType: "series",
              resourceId: item.series.id,
              fingerprint: "0".repeat(64),
            },
          },
        ],
      },
    });
    const [context] = await harness.db
      .select()
      .from(schema.copilotContextSnapshots)
      .where(eq(schema.copilotContextSnapshots.conversationId, seed.conversation.id));
    const bases = context!.canonicalBases as CanonicalBase[];
    const seriesBase = bases.find((base) => base.resourceType === "series")!;
    const entityBase = bases.find((base) => base.resourceId === item.entity.id)!;
    const chain = await harness.proposal({
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      seriesId: item.series.id,
      payload: {
        schemaVersion: 1,
        operations: [
          { type: "series.rename", targetId: item.series.id, name: "Renamed", base: seriesBase },
          {
            type: "entity.revise",
            targetId: item.entity.id,
            entityType: "character",
            name: "Rin Changed",
            data: { ...character, state: "injured" },
            base: entityBase,
          },
          {
            type: "entity.archive",
            targetId: item.entity.id,
            entityType: "character",
            base: entityBase,
          },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });
    await applyRevision(harness.db, {
      workspaceId: item.workspace.id,
      actorUserId: item.user.id,
      proposalId: chain.proposal.id,
      approvalId: decision.id,
      idempotencyKey: "modify",
      correlationId: "modify",
    });
    const [updatedSeries] = await harness.db
      .select()
      .from(schema.series)
      .where(eq(schema.series.id, item.series.id));
    const [updatedEntity] = await harness.db
      .select()
      .from(schema.entities)
      .where(eq(schema.entities.id, item.entity.id));
    const versions = await harness.db
      .select()
      .from(schema.entityVersions)
      .where(eq(schema.entityVersions.entityId, item.entity.id));
    expect(updatedSeries?.name).toBe("Renamed");
    expect(updatedEntity?.status).toBe("archived");
    expect(versions).toHaveLength(2);
  });

  it("does not enumerate foreign targets and rejects a viewer at apply time", async () => {
    const local = await fixture("modify-local");
    const foreign = await fixture("modify-foreign");
    const chain = await harness.proposal({
      workspaceId: local.workspace.id,
      actorUserId: local.user.id,
      seriesId: local.series.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "entity.archive",
            targetId: foreign.entity.id,
            entityType: "character",
            base: {
              resourceType: "character",
              resourceId: foreign.entity.id,
              revisionId: foreign.version.id,
              version: 1,
              fingerprint: "a".repeat(64),
            },
          },
        ],
      },
    });
    const checked = await validateRevision(harness.db, {
      workspaceId: local.workspace.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });
    expect(checked.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "target_not_found", message: "Target not found" }),
      ]),
    );
    expect(
      checked.findings.find((finding) => finding.code === "target_not_found"),
    ).not.toHaveProperty("resourceId");

    const own = await harness.proposal({
      workspaceId: local.workspace.id,
      actorUserId: local.user.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "series.create",
            clientRef: "created",
            name: "Viewer denied",
            slug: "viewer-denied",
          },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: local.workspace.id,
      actorUserId: local.user.id,
      proposalId: own.proposal.id,
      revisionId: own.revision.id,
      fingerprint: own.revision.fingerprint,
    });
    await harness.membership(local.workspace.id, local.user.id, "viewer");
    await expect(
      applyRevision(harness.db, {
        workspaceId: local.workspace.id,
        actorUserId: local.user.id,
        proposalId: own.proposal.id,
        approvalId: decision.id,
        idempotencyKey: "viewer",
        correlationId: "viewer",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(
      await harness.db
        .select()
        .from(schema.series)
        .where(
          and(
            eq(schema.series.workspaceId, local.workspace.id),
            eq(schema.series.slug, "viewer-denied"),
          ),
        ),
    ).toHaveLength(0);
  });
});
