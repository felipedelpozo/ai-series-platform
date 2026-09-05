import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { episodePlans, scenes, series, shots, type Db } from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";
import {
  EpisodePlanSchema,
  appendEpisodePlanRevisionInWorkspace,
  type EpisodePlanRevisionInput,
} from "./planner";

export const ShotSchema = z.object({
  type: z.string(),
  subject: z.string(),
  action: z.string(),
  composition: z.string(),
  camera: z.string(),
  lens: z.string(),
  lighting: z.string(),
  emotion: z.string(),
  requiredReferences: z.array(z.string()),
  imagePrompt: z.string(),
  videoPrompt: z.string(),
  continuityConstraints: z.array(z.string()),
});
export type Shot = z.infer<typeof ShotSchema>;

export const SceneSchema = z.object({
  purpose: z.string(),
  locationId: z.string(),
  characterIds: z.array(z.string()),
  propIds: z.array(z.string()),
  action: z.string(),
  dialogue: z.string(),
  estimatedDuration: z.string(),
  entryContinuity: z.string(),
  exitContinuity: z.string(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const SceneShotListSchema = z.object({
  scenes: z.array(SceneSchema.extend({ shots: z.array(ShotSchema) })),
});

export const SceneWithShotsSchema = SceneSchema.extend({ shots: z.array(ShotSchema).default([]) });
export type SceneWithShots = z.infer<typeof SceneWithShotsSchema>;

export type SceneShotSetResult = {
  sceneIds: string[];
  shotIds: string[];
};

export type EpisodeAggregateRevisionInput = Omit<EpisodePlanRevisionInput, "data"> & {
  plan: z.infer<typeof EpisodePlanSchema>;
  scenes: SceneWithShots[];
};

export type EpisodeAggregateRevisionResult = SceneShotSetResult & {
  planId: string;
  planVersion: number;
};

export type ReplaceEpisodeAggregateRevisionInput = {
  workspaceId: string;
  planId: string;
  scenes: SceneWithShots[];
  source?: string;
  promptSnapshotId?: string | null;
  status?: string;
};

/**
 * Appends a complete immutable episode aggregate using the caller's executor.
 * The caller owns the outer transaction; this primitive never starts one.
 */
export async function appendEpisodeAggregateRevisionInWorkspace(
  db: Db,
  input: EpisodeAggregateRevisionInput,
): Promise<EpisodeAggregateRevisionResult> {
  const revision = await appendEpisodePlanRevisionInWorkspace(db, {
    workspaceId: input.workspaceId,
    seriesId: input.seriesId,
    episodeNumber: input.episodeNumber,
    data: input.plan,
    source: input.source,
    promptSnapshotId: input.promptSnapshotId,
    status: input.status,
  });
  const created = await insertSceneShotSetInWorkspace(db, {
    workspaceId: input.workspaceId,
    planId: revision.id,
    scenes: input.scenes,
  });
  return {
    planId: revision.id,
    planVersion: revision.version,
    ...created,
  };
}

/** Inserts Scene screenplay fields and Shot children under a new, empty plan revision. */
export async function insertSceneShotSetInWorkspace(
  db: Db,
  input: { workspaceId: string; planId: string; scenes: SceneWithShots[] },
): Promise<SceneShotSetResult> {
  const parsedScenes = z.array(SceneWithShotsSchema).min(1).parse(input.scenes);
  const [plan] = await db
    .select({
      id: episodePlans.id,
      seriesId: episodePlans.seriesId,
      episodeNumber: episodePlans.episodeNumber,
    })
    .from(episodePlans)
    .innerJoin(series, eq(episodePlans.seriesId, series.id))
    .where(and(eq(episodePlans.id, input.planId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!plan) throw new Error("Episode plan not found");

  const existing = await db
    .select({ id: scenes.id })
    .from(scenes)
    .where(eq(scenes.planId, input.planId))
    .limit(1);
  if (existing.length > 0) throw new Error("Episode plan already has scenes");

  const sceneIds: string[] = [];
  const shotIds: string[] = [];
  for (const [sceneOrder, scene] of parsedScenes.entries()) {
    const { shots: sceneShots, ...sceneData } = scene;
    const [createdScene] = await db
      .insert(scenes)
      .values({
        seriesId: plan.seriesId,
        planId: plan.id,
        episodeNumber: plan.episodeNumber,
        order: sceneOrder,
        data: sceneData,
        status: "draft",
      })
      .returning({ id: scenes.id });
    if (!createdScene) throw new Error("Scene could not be created");
    sceneIds.push(createdScene.id);
    for (const [shotOrder, shot] of sceneShots.entries()) {
      const [createdShot] = await db
        .insert(shots)
        .values({
          sceneId: createdScene.id,
          order: shotOrder,
          data: shot,
          status: "draft",
        })
        .returning({ id: shots.id });
      if (!createdShot) throw new Error("Shot could not be created");
      shotIds.push(createdShot.id);
    }
  }
  return { sceneIds, shotIds };
}

/**
 * Replaces an existing Scene/Shot set by cloning its owning EpisodePlan into a new active revision.
 * The old plan and all of its Scene/Shot children remain unchanged and queryable.
 */
export async function replaceEpisodeAggregateRevisionInWorkspace(
  db: Db,
  input: ReplaceEpisodeAggregateRevisionInput,
): Promise<EpisodeAggregateRevisionResult> {
  const [reference] = await db
    .select({ seriesId: episodePlans.seriesId })
    .from(episodePlans)
    .innerJoin(series, eq(episodePlans.seriesId, series.id))
    .where(and(eq(episodePlans.id, input.planId), eq(series.workspaceId, input.workspaceId)))
    .limit(1);
  if (!reference) throw new Error("Episode plan not found");

  // Match appendEpisodePlanRevisionInWorkspace's series-first lock ordering.
  const [lockedSeries] = await db
    .select({ id: series.id })
    .from(series)
    .where(and(eq(series.id, reference.seriesId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!lockedSeries) throw new Error("Episode plan not found");

  const [basePlan] = await db
    .select({
      id: episodePlans.id,
      seriesId: episodePlans.seriesId,
      episodeNumber: episodePlans.episodeNumber,
      data: episodePlans.data,
      isActive: episodePlans.isActive,
    })
    .from(episodePlans)
    .where(and(eq(episodePlans.id, input.planId), eq(episodePlans.seriesId, reference.seriesId)))
    .limit(1)
    .for("update");
  if (!basePlan) throw new Error("Episode plan not found");
  if (!basePlan.isActive) throw new Error("Episode plan revision is stale");

  return appendEpisodeAggregateRevisionInWorkspace(db, {
    workspaceId: input.workspaceId,
    seriesId: basePlan.seriesId,
    episodeNumber: basePlan.episodeNumber,
    plan: EpisodePlanSchema.parse(basePlan.data),
    scenes: input.scenes,
    source: input.source ?? "manual",
    promptSnapshotId: input.promptSnapshotId,
    status: input.status,
  });
}

export async function generateSceneShotList(db: Db, input: { planId: string }): Promise<number> {
  const [plan] = await db.select().from(episodePlans).where(eq(episodePlans.id, input.planId));
  if (!plan) throw new Error("Plan not found");
  const active = await getActivePrompt(db, "scene.plan");
  if (!active) throw new Error("No active scene.plan prompt");
  const variables = { episode_plan: JSON.stringify(plan.data ?? {}) };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) throw new Error(`Missing prompt variables: ${missing.join(", ")}`);

  const result = await generateStructured({ prompt: rendered, schema: SceneShotListSchema });

  let created = 0;
  await db.transaction(async (tx) => {
    await tx.delete(scenes).where(eq(scenes.planId, input.planId));
    let order = 0;
    for (const scene of result.scenes) {
      const { shots: sceneShots, ...sceneData } = scene;
      const [createdScene] = await tx
        .insert(scenes)
        .values({
          seriesId: plan.seriesId,
          planId: plan.id,
          episodeNumber: plan.episodeNumber,
          order: order++,
          data: sceneData,
          status: "draft",
        })
        .returning({ id: scenes.id });
      let shotOrder = 0;
      for (const shot of sceneShots) {
        await tx.insert(shots).values({
          sceneId: createdScene.id,
          order: shotOrder++,
          data: shot,
          status: "draft",
        });
        created++;
      }
    }
  });
  return created;
}

export async function listScenesWithShots(db: Db, planId: string) {
  const sceneRows = await db
    .select()
    .from(scenes)
    .where(eq(scenes.planId, planId))
    .orderBy(asc(scenes.order));
  const result = [];
  for (const scene of sceneRows) {
    const shotRows = await db
      .select()
      .from(shots)
      .where(eq(shots.sceneId, scene.id))
      .orderBy(asc(shots.order));
    result.push({ ...scene, shots: shotRows });
  }
  return result;
}

export async function updateShotStatus(db: Db, shotId: string, status: string): Promise<void> {
  await db.update(shots).set({ status, updatedAt: new Date() }).where(eq(shots.id, shotId));
}

export async function updateShotData(
  db: Db,
  shotId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.update(shots).set({ data, updatedAt: new Date() }).where(eq(shots.id, shotId));
}

export async function reorderShots(db: Db, sceneId: string, shotIds: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < shotIds.length; i++) {
      await tx
        .update(shots)
        .set({ order: i, updatedAt: new Date() })
        .where(eq(shots.id, shotIds[i]!));
    }
  });
}
