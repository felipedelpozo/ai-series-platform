import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  generationSteps,
  jobs,
  scenes,
  shots,
  workspace,
  type Db,
} from "@ai-series/db";
import { enqueueJob } from "@ai-series/jobs";
import { getActivePrompt } from "@ai-series/prompts";

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) throw new Error("Default workspace not found");
  return row.id;
}

async function enqueueStep(
  db: Db,
  input: { shotId: string; kind: "keyframe" | "video"; prompt: string },
): Promise<string> {
  const purpose = input.kind === "keyframe" ? "image.generate" : "video.generate";
  const active = await getActivePrompt(db, purpose);
  if (!active) throw new Error(`No active ${purpose} prompt`);
  const workspaceId = await resolveWorkspaceId(db);
  const { id: jobId } = await enqueueJob(db, {
    workspaceId,
    idempotencyKey: randomUUID(),
    kind: input.kind === "keyframe" ? "image" : "video",
    input: { templateId: active.templateId, variables: { prompt: input.prompt }, params: {} },
  });
  const [step] = await db
    .insert(generationSteps)
    .values({
      shotId: input.shotId,
      kind: input.kind,
      status: "queued",
      jobId,
      input: { prompt: input.prompt },
    })
    .returning({ id: generationSteps.id });
  return step.id;
}

export async function generateShotKeyframe(
  db: Db,
  input: { shotId: string },
): Promise<{ stepId: string; reused: boolean }> {
  const [shot] = await db.select().from(shots).where(eq(shots.id, input.shotId));
  if (!shot) throw new Error("Shot not found");
  const existing = await db
    .select()
    .from(generationSteps)
    .where(and(eq(generationSteps.shotId, input.shotId), eq(generationSteps.kind, "keyframe")));
  const succeeded = existing.find((s) => s.status === "succeeded");
  if (succeeded) return { stepId: succeeded.id, reused: true };
  const data = shot.data as { imagePrompt?: string };
  const prompt = data.imagePrompt || "a cinematic frame";
  return { stepId: await enqueueStep(db, { shotId: input.shotId, kind: "keyframe", prompt }), reused: false };
}

export async function generateShotVideo(
  db: Db,
  input: { shotId: string },
): Promise<{ stepId: string; reused: boolean }> {
  const [shot] = await db.select().from(shots).where(eq(shots.id, input.shotId));
  if (!shot) throw new Error("Shot not found");
  const existing = await db
    .select()
    .from(generationSteps)
    .where(and(eq(generationSteps.shotId, input.shotId), eq(generationSteps.kind, "video")));
  const succeeded = existing.find((s) => s.status === "succeeded");
  if (succeeded) return { stepId: succeeded.id, reused: true };
  const data = shot.data as { videoPrompt?: string };
  const prompt = data.videoPrompt || "a cinematic shot";
  return { stepId: await enqueueStep(db, { shotId: input.shotId, kind: "video", prompt }), reused: false };
}

export async function syncStepStatus(db: Db, step: typeof generationSteps.$inferSelect) {
  if (step.status === "succeeded" || step.status === "failed") return step.status;
  if (!step.jobId) return step.status;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, step.jobId));
  if (!job) return step.status;
  if (job.status === "succeeded") {
    await db
      .update(generationSteps)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(eq(generationSteps.id, step.id));
    return "succeeded";
  }
  if (job.status === "failed") {
    await db
      .update(generationSteps)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(generationSteps.id, step.id));
    return "failed";
  }
  return job.status === "running" ? "running" : "queued";
}

export async function listShotSteps(db: Db, shotId: string) {
  const steps = await db.select().from(generationSteps).where(eq(generationSteps.shotId, shotId));
  const enriched = [];
  for (const step of steps) {
    const status = await syncStepStatus(db, step);
    enriched.push({ ...step, status });
  }
  return enriched;
}

export async function getPlanProgress(db: Db, planId: string) {
  const shotRows = await db
    .select({ id: shots.id })
    .from(shots)
    .innerJoin(scenes, eq(shots.sceneId, scenes.id))
    .where(eq(scenes.planId, planId));
  const totalShots = shotRows.length;
  let shotsWithKeyframe = 0;
  let shotsWithVideo = 0;
  for (const row of shotRows) {
    const steps = await listShotSteps(db, row.id);
    if (steps.some((s) => s.kind === "keyframe" && s.status === "succeeded")) shotsWithKeyframe++;
    if (steps.some((s) => s.kind === "video" && s.status === "succeeded")) shotsWithVideo++;
  }
  const status =
    totalShots === 0
      ? "pending"
      : shotsWithVideo === totalShots
        ? "approved"
        : shotsWithKeyframe === totalShots
          ? "needs-review"
          : "running";
  return { totalShots, shotsWithKeyframe, shotsWithVideo, status };
}

export async function generateAllKeyframes(db: Db, planId: string): Promise<number> {
  const shotRows = await db
    .select({ id: shots.id })
    .from(shots)
    .innerJoin(scenes, eq(shots.sceneId, scenes.id))
    .where(eq(scenes.planId, planId));
  let created = 0;
  for (const row of shotRows) {
    const { reused } = await generateShotKeyframe(db, { shotId: row.id });
    if (!reused) created++;
  }
  return created;
}

export async function generateAllVideos(db: Db, planId: string): Promise<number> {
  const shotRows = await db
    .select({ id: shots.id })
    .from(shots)
    .innerJoin(scenes, eq(shots.sceneId, scenes.id))
    .where(eq(scenes.planId, planId));
  let created = 0;
  for (const row of shotRows) {
    const { reused } = await generateShotVideo(db, { shotId: row.id });
    if (!reused) created++;
  }
  return created;
}
