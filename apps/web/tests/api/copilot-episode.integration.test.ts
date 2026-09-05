import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { schema } from "@ai-series/db";
import { applyRevision, decideRevision, validateRevision } from "../../app/api/copilot/_lib/store";
import {
  bible,
  character,
  createRuntimeHarness,
  hasDatabase,
  location,
  plan,
  prop,
  scene,
  type RuntimeHarness,
} from "./copilot-runtime-integration-helpers";

describe.skipIf(!hasDatabase)("copilot PostgreSQL episode application", () => {
  let harness: RuntimeHarness;

  beforeAll(async () => {
    harness = await createRuntimeHarness("ai_series_copilot_episode_test");
  });

  afterAll(async () => {
    await harness?.close();
  });

  async function canonicalSeries(slug: string) {
    const { workspace, user } = await harness.actor(slug);
    const [series] = await harness.db
      .insert(schema.series)
      .values({ workspaceId: workspace.id, name: slug, slug })
      .returning();
    const [activeBible] = await harness.db
      .insert(schema.seriesBibles)
      .values({ seriesId: series!.id, version: 1, ...bible, isActive: true })
      .returning();
    const entityInputs = [
      { type: "character", name: "Rin", data: character },
      { type: "location", name: "Station", data: location },
      { type: "prop", name: "Key", data: prop },
    ] as const;
    const createdEntities = [];
    for (const input of entityInputs) {
      const [entity] = await harness.db
        .insert(schema.entities)
        .values({ seriesId: series!.id, type: input.type, name: input.name })
        .returning();
      const [version] = await harness.db
        .insert(schema.entityVersions)
        .values({
          entityId: entity!.id,
          version: 1,
          name: input.name,
          data: input.data,
          isActive: true,
        })
        .returning();
      createdEntities.push({ entity: entity!, version: version! });
    }
    const [story] = await harness.db
      .insert(schema.storyStates)
      .values({
        seriesId: series!.id,
        version: 1,
        kind: "before",
        episode: 1,
        isCurrent: true,
        data: {
          currentEpisode: 1,
          characters: [],
          inventory: [],
          facts: [],
          goals: [],
          secretsKnown: [],
          secretsUnknown: [],
          openQuestions: [],
          pastDecisions: [],
          pendingConsequences: [],
          canon: ["The city changes nightly"],
        },
      })
      .returning();
    return {
      workspace,
      user,
      series: series!,
      bible: activeBible!,
      character: createdEntities[0]!,
      location: createdEntities[1]!,
      prop: createdEntities[2]!,
      story: story!,
    };
  }

  it("creates an EpisodePlan revision with canonical Scene screenplay and Shot children", async () => {
    const fixture = await canonicalSeries("episode-apply");
    const chain = await harness.proposal({
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      seriesId: fixture.series.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "episode_plan.append",
            clientRef: "episode-one",
            seriesId: fixture.series.id,
            episodeNumber: 1,
            data: plan(
              fixture.character.entity.id,
              fixture.location.entity.id,
              fixture.prop.entity.id,
            ),
          },
          {
            type: "scene_set.replace_with_revision",
            planRef: "episode-one",
            scenes: [
              scene(
                fixture.character.entity.id,
                fixture.location.entity.id,
                fixture.prop.entity.id,
              ),
            ],
          },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });
    const applied = await applyRevision(harness.db, {
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      proposalId: chain.proposal.id,
      approvalId: decision.id,
      idempotencyKey: "episode-apply",
      correlationId: "episode-apply",
    });

    const [episodePlan] = await harness.db
      .select()
      .from(schema.episodePlans)
      .where(
        and(
          eq(schema.episodePlans.seriesId, fixture.series.id),
          eq(schema.episodePlans.episodeNumber, 1),
        ),
      );
    const sceneRows = await harness.db
      .select()
      .from(schema.scenes)
      .where(eq(schema.scenes.planId, episodePlan!.id));
    const shotRows = await harness.db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.sceneId, sceneRows[0]!.id));
    expect(episodePlan?.version).toBe(1);
    expect(sceneRows).toHaveLength(1);
    expect(sceneRows[0]!.data).toMatchObject({
      purpose: "Reveal the moving station",
      dialogue: "This was not here yesterday.",
    });
    expect(shotRows).toHaveLength(1);
    expect(applied.receipt.canonicalResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ resourceType: "episode_plan", resourceId: episodePlan!.id }),
      ]),
    );
  });

  for (const changedBase of ["bible", "entity", "story"] as const) {
    it(`rejects approval after the active ${changedBase} context changes`, async () => {
      const fixture = await canonicalSeries(`stale-${changedBase}`);
      const chain = await harness.proposal({
        workspaceId: fixture.workspace.id,
        actorUserId: fixture.user.id,
        seriesId: fixture.series.id,
        payload: {
          schemaVersion: 1,
          operations: [
            {
              type: "episode_plan.append",
              clientRef: "episode",
              seriesId: fixture.series.id,
              episodeNumber: 1,
              data: plan(
                fixture.character.entity.id,
                fixture.location.entity.id,
                fixture.prop.entity.id,
              ),
            },
          ],
        },
      });

      if (changedBase === "bible") {
        await harness.db
          .update(schema.seriesBibles)
          .set({ isActive: false })
          .where(eq(schema.seriesBibles.id, fixture.bible.id));
        await harness.db.insert(schema.seriesBibles).values({
          seriesId: fixture.series.id,
          version: 2,
          ...bible,
          title: "Changed",
          isActive: true,
        });
      } else if (changedBase === "entity") {
        await harness.db
          .update(schema.entityVersions)
          .set({ isActive: false })
          .where(eq(schema.entityVersions.id, fixture.character.version.id));
        await harness.db.insert(schema.entityVersions).values({
          entityId: fixture.character.entity.id,
          version: 2,
          name: "Rin",
          data: { ...character, state: "changed" },
          isActive: true,
        });
      } else {
        await harness.db
          .update(schema.storyStates)
          .set({ isCurrent: false })
          .where(eq(schema.storyStates.id, fixture.story.id));
        await harness.db.insert(schema.storyStates).values({
          seriesId: fixture.series.id,
          version: 2,
          kind: "before",
          episode: 1,
          data: { canon: ["changed"] },
          isCurrent: true,
        });
      }

      const checked = await validateRevision(harness.db, {
        workspaceId: fixture.workspace.id,
        proposalId: chain.proposal.id,
        revisionId: chain.revision.id,
        fingerprint: chain.revision.fingerprint,
      });
      await expect(
        decideRevision(harness.db, {
          workspaceId: fixture.workspace.id,
          actorUserId: fixture.user.id,
          proposalId: chain.proposal.id,
          revisionId: chain.revision.id,
          validationRunId: checked.validation.id,
          fingerprint: chain.revision.fingerprint,
          decision: "approve",
        }),
      ).rejects.toMatchObject({ code: "validation_failed" });
    });
  }

  it("never applies while a captured StoryState changes concurrently", async () => {
    const fixture = await canonicalSeries("concurrent-story");
    const chain = await harness.proposal({
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      seriesId: fixture.series.id,
      payload: {
        schemaVersion: 1,
        operations: [
          {
            type: "episode_plan.append",
            clientRef: "episode",
            seriesId: fixture.series.id,
            episodeNumber: 1,
            data: plan(
              fixture.character.entity.id,
              fixture.location.entity.id,
              fixture.prop.entity.id,
            ),
          },
        ],
      },
    });
    const { decision } = await harness.approve({
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      proposalId: chain.proposal.id,
      revisionId: chain.revision.id,
      fingerprint: chain.revision.fingerprint,
    });
    let releaseMutation!: () => void;
    let announceLock!: () => void;
    const locked = new Promise<void>((resolve) => (announceLock = resolve));
    const release = new Promise<void>((resolve) => (releaseMutation = resolve));
    const mutation = harness.sql.begin(async (sql) => {
      await sql`select id from story_states where id = ${fixture.story.id} for update`;
      announceLock();
      await release;
      await sql`update story_states set data = jsonb_set(data, '{facts}', '["changed"]'::jsonb) where id = ${fixture.story.id}`;
    });
    await locked;
    const application = applyRevision(harness.db, {
      workspaceId: fixture.workspace.id,
      actorUserId: fixture.user.id,
      proposalId: chain.proposal.id,
      approvalId: decision.id,
      idempotencyKey: "concurrent-story",
      correlationId: "concurrent-story",
    }).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    releaseMutation();
    await mutation;
    const outcome = await application;
    expect(outcome).toHaveProperty("error");
    expect((outcome as { error: { code?: string } }).error.code).toBe("stale_draft");
    expect(
      await harness.db
        .select()
        .from(schema.copilotApplicationReceipts)
        .where(eq(schema.copilotApplicationReceipts.approvalId, decision.id)),
    ).toHaveLength(0);
  });
});
