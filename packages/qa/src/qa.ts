import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  episodePlans,
  generationSteps,
  qaFindings,
  scenes,
  shots,
  type Db,
} from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";
import { getSeriesDetail } from "@ai-series/series";
import { getCurrentStoryState } from "@ai-series/story";
import {
  checkDuplicateShots,
  checkEmptyOutput,
  checkMissingCliffhanger,
  type FindingInput,
} from "./checks";

const QaFindingsSchema = z.object({
  findings: z.array(
    z.object({
      check: z.string(),
      severity: z.string(),
      evidence: z.string(),
      target: z.string(),
      repair: z.string(),
    }),
  ),
});

async function insertFindings(db: Db, planId: string, inputs: FindingInput[]): Promise<number> {
  let count = 0;
  for (const input of inputs) {
    await db.insert(qaFindings).values({
      planId,
      shotId: input.shotId ?? null,
      check: input.check,
      severity: input.severity,
      evidence: input.evidence ?? null,
      target: input.target ?? null,
      repair: input.repair ?? null,
      status: "open",
    });
    count++;
  }
  return count;
}

export async function runDeterministicChecks(db: Db, planId: string): Promise<number> {
  const [plan] = await db.select().from(episodePlans).where(eq(episodePlans.id, planId));
  if (!plan) throw new Error("Plan not found");
  const shotRows = await db
    .select({ id: shots.id, data: shots.data })
    .from(shots)
    .innerJoin(scenes, eq(shots.sceneId, scenes.id))
    .where(eq(scenes.planId, planId));
  const withKeyframe = new Set<string>();
  for (const shot of shotRows) {
    const steps = await db
      .select()
      .from(generationSteps)
      .where(eq(generationSteps.shotId, shot.id));
    if (steps.some((s) => s.kind === "keyframe" && s.status === "succeeded")) {
      withKeyframe.add(shot.id);
    }
  }
  const findings = [
    ...checkMissingCliffhanger({ data: plan.data }),
    ...checkDuplicateShots(shotRows),
    ...checkEmptyOutput(shotRows, withKeyframe),
  ];
  return insertFindings(db, planId, findings);
}

export async function runLlmQa(db: Db, planId: string): Promise<number> {
  const [plan] = await db.select().from(episodePlans).where(eq(episodePlans.id, planId));
  if (!plan) throw new Error("Plan not found");
  const detail = await getSeriesDetail(db, plan.seriesId);
  const bible = detail?.bibles.find((b) => b.isActive);
  const state = await getCurrentStoryState(db, plan.seriesId);
  const shotList = JSON.stringify(plan.data ?? {});

  let total = 0;
  for (const purpose of ["qa.narrative", "qa.visual", "qa.continuity"] as const) {
    const active = await getActivePrompt(db, purpose);
    if (!active) continue;
    const variables = {
      episode_plan: JSON.stringify(plan.data ?? {}),
      story_state: JSON.stringify(state?.data ?? {}),
      series_bible: JSON.stringify(bible ?? {}),
      shot_list: shotList,
    };
    const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
    if (missing.length > 0) continue;
    try {
      const result = await generateStructured({ prompt: rendered, schema: QaFindingsSchema });
      total += await insertFindings(
        db,
        planId,
        result.findings.map((f) => ({ ...f, severity: f.severity as FindingInput["severity"] })),
      );
    } catch {
      // AI QA is best-effort; deterministic checks remain authoritative
    }
  }
  return total;
}

export async function listFindings(db: Db, planId: string) {
  return db.select().from(qaFindings).where(eq(qaFindings.planId, planId));
}

export async function resolveFinding(
  db: Db,
  findingId: string,
  status: "accepted" | "ignored" | "repaired",
  resolution?: string,
): Promise<void> {
  await db
    .update(qaFindings)
    .set({ status, resolution: resolution ?? null, updatedAt: new Date() })
    .where(eq(qaFindings.id, findingId));
}
