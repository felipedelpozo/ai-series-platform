import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { episodePlans, scenes, schema, series, shots, workspace, type Db } from "@ai-series/db";
import { replaceEpisodeAggregateRevisionInWorkspace } from "./scenes";

const TEST_DB = "ai_series_planner_revision_test";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");
const hasDb = Boolean(process.env.DATABASE_URL);

const planData = {
  hook: "A door opens",
  dramaticGoal: "find the key",
  beats: ["beat 1"],
  targetDuration: "60s",
  characterIds: [],
  locationIds: [],
  propIds: [],
  reveals: ["the truth"],
  requiredContinuity: [],
  closing: "Rin leaves",
  cliffhanger: "the door closes",
  audienceQuestion: null,
  proposedStoryStateAfter: {
    currentEpisode: 2,
    characters: [],
    inventory: [],
    facts: ["found the key"],
    goals: [],
    secretsKnown: [],
    secretsUnknown: [],
    openQuestions: [],
    pastDecisions: [],
    pendingConsequences: [],
    canon: [],
  },
};

const replacementScenes = [
  {
    purpose: "Reveal the key",
    locationId: "location-1",
    characterIds: [],
    propIds: [],
    action: "Rin opens her hand.",
    dialogue: "RIN: It was here all along.",
    estimatedDuration: "12s",
    entryContinuity: "Rin enters empty-handed.",
    exitContinuity: "Rin holds the key.",
    shots: [
      {
        type: "close-up",
        subject: "Rin",
        action: "opens her hand",
        composition: "centered",
        camera: "static",
        lens: "50mm",
        lighting: "low key",
        emotion: "tense",
        requiredReferences: [],
        imagePrompt: "Rin's hand holding a key",
        videoPrompt: "Rin slowly opens her hand",
        continuityConstraints: ["red coat"],
      },
    ],
  },
];

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

describe.skipIf(!hasDb)("immutable EpisodePlan/Scene/Shot aggregate revisions", () => {
  let db: Db;
  let sqlClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();
    sqlClient = postgres(databaseUrl(TEST_DB), { max: 5 });
    db = drizzle(sqlClient, { schema });
    await migrate(db, { migrationsFolder });
  });

  afterAll(async () => {
    await sqlClient?.end();
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  });

  async function seed(label: string) {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ name: `Workspace ${label}`, slug: `planner-${label}` })
      .returning();
    const [seriesRow] = await db
      .insert(series)
      .values({ workspaceId: workspaceRow!.id, name: `Series ${label}`, slug: `series-${label}` })
      .returning();
    const [plan] = await db
      .insert(episodePlans)
      .values({
        seriesId: seriesRow!.id,
        episodeNumber: 1,
        version: 1,
        data: planData,
        source: "manual",
        isActive: true,
      })
      .returning();
    const [scene] = await db
      .insert(scenes)
      .values({
        seriesId: seriesRow!.id,
        planId: plan!.id,
        episodeNumber: 1,
        order: 0,
        data: { action: "Original action", dialogue: "Original dialogue" },
      })
      .returning();
    await db.insert(shots).values({ sceneId: scene!.id, order: 0, data: { action: "Original" } });
    return { workspaceId: workspaceRow!.id, seriesId: seriesRow!.id, planId: plan!.id };
  }

  test("creates version 2 while preserving version 1 and its screenplay rows", async () => {
    const seeded = await seed("success");
    const result = await db.transaction((tx) =>
      replaceEpisodeAggregateRevisionInWorkspace(tx, {
        workspaceId: seeded.workspaceId,
        planId: seeded.planId,
        scenes: replacementScenes,
        source: "copilot",
      }),
    );

    const plans = await db
      .select()
      .from(episodePlans)
      .where(and(eq(episodePlans.seriesId, seeded.seriesId), eq(episodePlans.episodeNumber, 1)));
    const oldScenes = await db.select().from(scenes).where(eq(scenes.planId, seeded.planId));
    const newScenes = await db.select().from(scenes).where(eq(scenes.planId, result.planId));
    const oldShots = await db.select().from(shots).where(eq(shots.sceneId, oldScenes[0]!.id));

    expect(result.planVersion).toBe(2);
    expect(result.planId).not.toBe(seeded.planId);
    expect(plans).toHaveLength(2);
    expect(plans.find((plan) => plan.id === seeded.planId)?.isActive).toBe(false);
    expect(plans.find((plan) => plan.id === result.planId)?.isActive).toBe(true);
    expect(oldScenes).toHaveLength(1);
    expect(oldShots).toHaveLength(1);
    expect(newScenes).toHaveLength(1);
    expect(newScenes[0]?.data).toMatchObject({
      action: "Rin opens her hand.",
      dialogue: "RIN: It was here all along.",
    });
  });

  test("rolls back plan activation and new rows when the outer transaction fails", async () => {
    const seeded = await seed("rollback");
    await expect(
      db.transaction(async (tx) => {
        await replaceEpisodeAggregateRevisionInWorkspace(tx, {
          workspaceId: seeded.workspaceId,
          planId: seeded.planId,
          scenes: replacementScenes,
          source: "copilot",
        });
        throw new Error("receipt insertion failed");
      }),
    ).rejects.toThrow("receipt insertion failed");

    const plans = await db
      .select()
      .from(episodePlans)
      .where(eq(episodePlans.seriesId, seeded.seriesId));
    const oldScenes = await db.select().from(scenes).where(eq(scenes.planId, seeded.planId));
    const oldShots = await db.select().from(shots).where(eq(shots.sceneId, oldScenes[0]!.id));
    expect(plans).toHaveLength(1);
    expect(plans[0]?.isActive).toBe(true);
    expect(oldScenes).toHaveLength(1);
    expect(oldShots).toHaveLength(1);
  });
});
