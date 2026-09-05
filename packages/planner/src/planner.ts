import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { episodePlans, promptSnapshots, type Db } from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";
import { getSeriesDetail } from "@ai-series/series";
import { getCurrentStoryState, StoryStateStrictSchema } from "@ai-series/story";
import { listActiveEntities, type ActiveEntity, type EntityType } from "@ai-series/entities";

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

export function buildEpisodePlanPrompt(basePrompt: string, details?: string): string {
  const normalizedDetails = details?.trim();
  if (!normalizedDetails) return basePrompt;

  return `${basePrompt}\n\nCreator-provided episode details:\n<episode_details>\n${normalizedDetails}\n</episode_details>\nIncorporate these details into the episode plan while preserving the required output contract.`;
}

export function buildEntitiesContext(activeEntities: ActiveEntity[]): string {
  const groups: Record<EntityType, { id: string; name: string; data: Record<string, unknown> }[]> =
    {
      character: [],
      location: [],
      prop: [],
    };
  for (const entity of activeEntities) {
    if (!Object.hasOwn(groups, entity.type)) continue;
    groups[entity.type].push({ id: entity.id, name: entity.name, data: entity.data });
  }
  return JSON.stringify(
    {
      characters: groups.character,
      locations: groups.location,
      props: groups.prop,
    },
    null,
    2,
  );
}

export function appendEntitiesContext(basePrompt: string, entitiesContext: string): string {
  return `${basePrompt}\n\nAvailable series entities (characters, locations, props) with their canonical ids:\n<series_entities>\n${entitiesContext}\n</series_entities>\nUse ONLY these entity ids in characterIds, locationIds, and propIds. Do not invent new ids; return an empty array for any field with no relevant existing entity.`;
}

export function sanitizePlanEntityIds(
  plan: EpisodePlan,
  activeEntities: ActiveEntity[],
): EpisodePlan {
  const idsByType: Record<EntityType, Set<string>> = {
    character: new Set(),
    location: new Set(),
    prop: new Set(),
  };
  for (const entity of activeEntities) {
    if (!Object.hasOwn(idsByType, entity.type)) continue;
    idsByType[entity.type].add(entity.id);
  }
  return {
    ...plan,
    characterIds: plan.characterIds.filter((id) => idsByType.character.has(id)),
    locationIds: plan.locationIds.filter((id) => idsByType.location.has(id)),
    propIds: plan.propIds.filter((id) => idsByType.prop.has(id)),
  };
}

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
      .where(
        and(eq(episodePlans.seriesId, seriesId), eq(episodePlans.episodeNumber, episodeNumber)),
      );
    const next = Math.max(0, ...existing.map((v) => v.version)) + 1;
    await tx
      .update(episodePlans)
      .set({ isActive: false })
      .where(
        and(eq(episodePlans.seriesId, seriesId), eq(episodePlans.episodeNumber, episodeNumber)),
      );
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
  input: { seriesId: string; episodeNumber: number; audienceDecision?: string; details?: string },
): Promise<string> {
  const detail = await getSeriesDetail(db, input.seriesId);
  if (!detail) throw new Error("Series not found");
  const bible = detail.bibles.find((b) => b.isActive);
  const state = await getCurrentStoryState(db, input.seriesId);
  const activeEntities = await listActiveEntities(db, input.seriesId);
  const active = await getActivePrompt(db, "episode.plan");
  if (!active) throw new Error("No active episode.plan prompt");

  const entitiesContext = buildEntitiesContext(activeEntities);
  const details = input.details?.trim();
  const hasDetailsPlaceholder = active.template.includes("{{episode_details}}");
  const hasEntitiesPlaceholder = active.template.includes("{{entities}}");
  const variables = {
    series_name: detail.series.name,
    episode_number: String(input.episodeNumber),
    series_bible: JSON.stringify(bible ?? {}),
    story_state_before: JSON.stringify(state?.data ?? {}),
    audience_decision: input.audienceDecision ?? "none",
    entities: entitiesContext,
    ...(details
      ? { episode_details: details }
      : hasDetailsPlaceholder
        ? { episode_details: "No additional episode details provided." }
        : {}),
  };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) throw new Error(`Missing prompt variables: ${missing.join(", ")}`);

  let finalPrompt = rendered;
  if (!hasEntitiesPlaceholder) {
    finalPrompt = appendEntitiesContext(finalPrompt, entitiesContext);
  }
  if (!hasDetailsPlaceholder) {
    finalPrompt = buildEpisodePlanPrompt(finalPrompt, details);
  }
  const rawObject = await generateStructured({ prompt: finalPrompt, schema: EpisodePlanSchema });
  const object = sanitizePlanEntityIds(rawObject, activeEntities);
  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: active.templateId,
      versionId: active.versionId,
      renderedText: finalPrompt,
      variables,
      model: "gpt-4o-mini",
      params: {},
    })
    .returning({ id: promptSnapshots.id });

  return createPlanVersion(
    db,
    input.seriesId,
    input.episodeNumber,
    object,
    "generated",
    snapshot.id,
  );
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
