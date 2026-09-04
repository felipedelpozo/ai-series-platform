import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { episodePlans, promptSnapshots, type Db } from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";
import { getSeriesDetail } from "@ai-series/series";
import { getCurrentStoryState, StoryStateStrictSchema } from "@ai-series/story";

export const EpisodePlanSchema = z.object({
  hook: z.string(),
  dramaticGoal: z.string(),
  beats: z.array(z.string()),
  targetDuration: z.string(),
  characterIds: z.array(z.string()),
  locationIds: z.array(z.string()),
  propIds: z.array(z.string()),
  reveals: z.array(z.string()),
  requiredContinuity: z.array(z.string()),
  closing: z.string(),
  cliffhanger: z.string(),
  audienceQuestion: z.string().nullable(),
  proposedStoryStateAfter: StoryStateStrictSchema,
});
export type EpisodePlan = z.infer<typeof EpisodePlanSchema>;

async function createPlanVersion(
  db: Db,
  seriesId: string,
  episodeNumber: number,
  data: EpisodePlan,
  source: "manual" | "generated",
  promptSnapshotId: string | null,
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ version: episodePlans.version })
      .from(episodePlans)
      .where(and(eq(episodePlans.seriesId, seriesId), eq(episodePlans.episodeNumber, episodeNumber)));
    const next = Math.max(0, ...existing.map((v) => v.version)) + 1;
    await tx
      .update(episodePlans)
      .set({ isActive: false })
      .where(and(eq(episodePlans.seriesId, seriesId), eq(episodePlans.episodeNumber, episodeNumber)));
    const [created] = await tx
      .insert(episodePlans)
      .values({
        seriesId,
        episodeNumber,
        version: next,
        data,
        status: "draft",
        source,
        promptSnapshotId,
        isActive: true,
      })
      .returning({ id: episodePlans.id });
    return created.id;
  });
}

export async function generateEpisodePlan(
  db: Db,
  input: { seriesId: string; episodeNumber: number; audienceDecision?: string },
): Promise<string> {
  const detail = await getSeriesDetail(db, input.seriesId);
  if (!detail) throw new Error("Series not found");
  const bible = detail.bibles.find((b) => b.isActive);
  const state = await getCurrentStoryState(db, input.seriesId);
  const active = await getActivePrompt(db, "episode.plan");
  if (!active) throw new Error("No active episode.plan prompt");

  const variables = {
    series_name: detail.series.name,
    episode_number: String(input.episodeNumber),
    series_bible: JSON.stringify(bible ?? {}),
    story_state_before: JSON.stringify(state?.data ?? {}),
    audience_decision: input.audienceDecision ?? "none",
  };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) throw new Error(`Missing prompt variables: ${missing.join(", ")}`);

  const object = await generateStructured({ prompt: rendered, schema: EpisodePlanSchema });
  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: active.templateId,
      versionId: active.versionId,
      renderedText: rendered,
      variables,
      model: "gpt-4o-mini",
      params: {},
    })
    .returning({ id: promptSnapshots.id });

  return createPlanVersion(db, input.seriesId, input.episodeNumber, object, "generated", snapshot.id);
}

export async function editEpisodePlan(db: Db, planId: string, data: EpisodePlan): Promise<string> {
  const [plan] = await db.select().from(episodePlans).where(eq(episodePlans.id, planId));
  if (!plan) throw new Error("Plan not found");
  return createPlanVersion(db, plan.seriesId, plan.episodeNumber, data, "manual", null);
}

export async function approveEpisodePlan(db: Db, planId: string): Promise<void> {
  await db.update(episodePlans).set({ status: "approved" }).where(eq(episodePlans.id, planId));
}

export async function listEpisodePlans(db: Db, seriesId: string) {
  return db
    .select()
    .from(episodePlans)
    .where(eq(episodePlans.seriesId, seriesId))
    .orderBy(desc(episodePlans.episodeNumber), desc(episodePlans.version))
    .limit(200);
}
