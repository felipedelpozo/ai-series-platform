import { and, desc, eq } from "drizzle-orm";
import {
  audienceDecisions,
  branches,
  decisionCandidates,
  episodeLoops,
  episodePlans,
  type Db,
} from "@ai-series/db";
import {
  StoryStateSchema,
  diffStoryStates,
  getCurrentStoryState,
  recordStoryState,
  type StoryState,
} from "@ai-series/story";
import { generateEpisodePlan, generateSceneShotList } from "@ai-series/planner";
import { generateAllKeyframes } from "@ai-series/production";

export function computeNextStoryState(
  current: StoryState,
  decision: { label: string },
  toEpisode: number,
): StoryState {
  return {
    ...current,
    currentEpisode: toEpisode,
    pastDecisions: [...current.pastDecisions, decision.label],
  };
}

function defaultStoryState(): StoryState {
  return StoryStateSchema.parse({});
}

export async function createBranch(
  db: Db,
  input: { seriesId: string; name: string; baseEpisode: number; parentBranchId?: string },
): Promise<string> {
  const [created] = await db
    .insert(branches)
    .values({
      seriesId: input.seriesId,
      name: input.name,
      parentBranchId: input.parentBranchId ?? null,
      baseEpisode: input.baseEpisode,
      isCanonical: false,
    })
    .returning({ id: branches.id });
  return created.id;
}

export async function listBranches(db: Db, seriesId: string) {
  return db
    .select()
    .from(branches)
    .where(eq(branches.seriesId, seriesId))
    .orderBy(desc(branches.createdAt));
}

type WinningDecision = { label: string; summary: string | null };

async function resolveWinningDecision(db: Db, decisionId: string): Promise<WinningDecision> {
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, decisionId));
  if (!decision) throw new Error("Decision not found");
  if (decision.status !== "approved") throw new Error(`Decision is ${decision.status}, not approved`);

  const candidates = await db
    .select()
    .from(decisionCandidates)
    .where(eq(decisionCandidates.decisionId, decisionId));
  const winner =
    candidates.find((c) => c.isWinner) ??
    (decision.winningCandidateId
      ? candidates.find((c) => c.id === decision.winningCandidateId)
      : undefined);
  const label = winner?.label ?? decision.title ?? "Sin decisión";
  return { label, summary: winner?.summary ?? decision.summary ?? null };
}

async function createDraftPlan(
  db: Db,
  input: {
    seriesId: string;
    episodeNumber: number;
    data: Record<string, unknown>;
    isCanonical: boolean;
  },
): Promise<string> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ version: episodePlans.version })
      .from(episodePlans)
      .where(
        and(
          eq(episodePlans.seriesId, input.seriesId),
          eq(episodePlans.episodeNumber, input.episodeNumber),
        ),
      );
    const nextVersion = Math.max(0, ...existing.map((v) => v.version)) + 1;
    if (input.isCanonical) {
      await tx
        .update(episodePlans)
        .set({ isActive: false })
        .where(
          and(
            eq(episodePlans.seriesId, input.seriesId),
            eq(episodePlans.episodeNumber, input.episodeNumber),
          ),
        );
    }
    const [created] = await tx
      .insert(episodePlans)
      .values({
        seriesId: input.seriesId,
        episodeNumber: input.episodeNumber,
        version: nextVersion,
        data: input.data,
        status: "draft",
        source: "loop",
        isActive: input.isCanonical,
      })
      .returning({ id: episodePlans.id });
    return created.id;
  });
}

export async function applyApprovedDecision(
  db: Db,
  input: { seriesId: string; decisionId: string; branchId?: string },
): Promise<{ loopId: string; planId: string; toEpisode: number }> {
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, input.decisionId));
  if (!decision) throw new Error("Decision not found");
  if (decision.seriesId !== input.seriesId) throw new Error("Decision does not belong to this series");

  const winner = await resolveWinningDecision(db, input.decisionId);
  const toEpisode = decision.episodeNumber + 1;
  const fromEpisode = decision.episodeNumber;

  const currentRow = await getCurrentStoryState(db, input.seriesId);
  const before = currentRow ? StoryStateSchema.parse(currentRow.data) : defaultStoryState();
  const after = computeNextStoryState(before, { label: winner.label }, toEpisode);
  const changes = diffStoryStates(before, after);

  const isCanonical = !input.branchId;
  let storyStateVersionAfter: number | null = null;
  if (isCanonical) {
    await recordStoryState(db, {
      seriesId: input.seriesId,
      kind: "after",
      episode: toEpisode,
      data: after,
    });
    const nextRow = await getCurrentStoryState(db, input.seriesId);
    storyStateVersionAfter = nextRow?.version ?? null;
  }

  const planId = await createDraftPlan(db, {
    seriesId: input.seriesId,
    episodeNumber: toEpisode,
    isCanonical,
    data: {
      hook: `Continuación tras decisión: ${winner.label}`,
      dramaticGoal: winner.label,
      beats: [winner.label],
      targetDuration: "60s",
      characterIds: [],
      locationIds: [],
      propIds: [],
      reveals: [],
      requiredContinuity: [],
      closing: "",
      cliffhanger: "",
      audienceQuestion: null,
      proposedStoryStateAfter: after,
    },
  });

  const [loop] = await db
    .insert(episodeLoops)
    .values({
      seriesId: input.seriesId,
      decisionId: input.decisionId,
      branchId: input.branchId ?? null,
      fromEpisode,
      toEpisode,
      storyStateVersionBefore: currentRow?.version ?? null,
      storyStateVersionAfter,
      planId,
      status: "draft",
      transition: {
        decision: { label: winner.label, summary: winner.summary },
        before,
        after,
        changes,
      },
    })
    .returning({ id: episodeLoops.id });

  return { loopId: loop.id, planId, toEpisode };
}

export async function generateLoopPlan(db: Db, loopId: string): Promise<string> {
  const [loop] = await db.select().from(episodeLoops).where(eq(episodeLoops.id, loopId));
  if (!loop) throw new Error("Loop not found");
  const winner = await resolveWinningDecision(db, loop.decisionId);
  const planId = await generateEpisodePlan(db, {
    seriesId: loop.seriesId,
    episodeNumber: loop.toEpisode,
    audienceDecision: winner.label,
  });
  await db
    .update(episodeLoops)
    .set({ planId, status: "planned", updatedAt: new Date() })
    .where(eq(episodeLoops.id, loopId));
  return planId;
}

export async function generateLoopScenes(db: Db, loopId: string): Promise<number> {
  const [loop] = await db.select().from(episodeLoops).where(eq(episodeLoops.id, loopId));
  if (!loop?.planId) throw new Error("Loop plan not found");
  const count = await generateSceneShotList(db, { planId: loop.planId });
  await db
    .update(episodeLoops)
    .set({ status: "scenes", updatedAt: new Date() })
    .where(eq(episodeLoops.id, loopId));
  return count;
}

export async function startLoopGeneration(db: Db, loopId: string): Promise<number> {
  const [loop] = await db.select().from(episodeLoops).where(eq(episodeLoops.id, loopId));
  if (!loop?.planId) throw new Error("Loop plan not found");
  const keyframes = await generateAllKeyframes(db, loop.planId);
  await db
    .update(episodeLoops)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(episodeLoops.id, loopId));
  return keyframes;
}

export async function listDecisionTimeline(db: Db, seriesId: string) {
  return db
    .select()
    .from(episodeLoops)
    .where(eq(episodeLoops.seriesId, seriesId))
    .orderBy(desc(episodeLoops.toEpisode), desc(episodeLoops.createdAt));
}

export async function getLoop(db: Db, loopId: string) {
  const [loop] = await db.select().from(episodeLoops).where(eq(episodeLoops.id, loopId));
  if (!loop) return null;
  const [decision] = await db
    .select()
    .from(audienceDecisions)
    .where(eq(audienceDecisions.id, loop.decisionId));
  const [plan] = loop.planId
    ? await db.select().from(episodePlans).where(eq(episodePlans.id, loop.planId))
    : [];
  return { loop, decision: decision ?? null, plan: plan ?? null };
}
