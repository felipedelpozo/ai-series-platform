import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { episodePlans, scenes, shots, type Db } from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";

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

export async function generateSceneShotList(
  db: Db,
  input: { planId: string },
): Promise<number> {
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
      await tx.update(shots).set({ order: i, updatedAt: new Date() }).where(eq(shots.id, shotIds[i]!));
    }
  });
}
