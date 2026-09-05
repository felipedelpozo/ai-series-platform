import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  assets,
  costRecords,
  generationSteps,
  generations,
  jobAttempts,
  jobEvents,
  jobs,
  scenes,
  shots,
  workspace,
  type Db,
} from "@ai-series/db";

const STUCK_RUNNING_MS = 10 * 60 * 1000;

export function isJobStuck(
  job: { status: string; updatedAt: Date; attemptCount: number; maxAttempts: number },
  now: number = Date.now(),
): boolean {
  if (job.status === "running") {
    return now - new Date(job.updatedAt).getTime() > STUCK_RUNNING_MS;
  }
  if (job.status === "queued") {
    return job.attemptCount >= job.maxAttempts;
  }
  return false;
}

export function estimateCost(kind: string, model?: string | null): number {
  const base = kind === "video" ? 0.05 : 0.01;
  if (model && /h3|max|large|pro/i.test(model)) return base * 2;
  return base;
}

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) throw new Error("Default workspace not found");
  return row.id;
}

export type CostRecordInput = {
  workspaceId?: string;
  jobId?: string;
  generationId?: string;
  seriesId?: string;
  episodeNumber?: number;
  sceneId?: string;
  shotId?: string;
  provider: string;
  model?: string | null;
  kind: string;
  status?: "success" | "error" | "retry";
  phase?: "estimate" | "actual";
  estimatedCost?: number;
  actualCost?: number;
  durationMs?: number;
  correlationId?: string;
  error?: string;
};

export async function recordCost(db: Db, input: CostRecordInput): Promise<string> {
  const workspaceId = input.workspaceId ?? (await resolveWorkspaceId(db));
  const [created] = await db
    .insert(costRecords)
    .values({
      workspaceId,
      jobId: input.jobId ?? null,
      generationId: input.generationId ?? null,
      seriesId: input.seriesId ?? null,
      episodeNumber: input.episodeNumber ?? null,
      sceneId: input.sceneId ?? null,
      shotId: input.shotId ?? null,
      provider: input.provider,
      model: input.model ?? null,
      kind: input.kind,
      status: input.status ?? "success",
      phase: input.phase ?? "actual",
      estimatedCost: input.estimatedCost ?? null,
      actualCost: input.actualCost ?? null,
      durationMs: input.durationMs ?? null,
      correlationId: input.correlationId ?? null,
      error: input.error ?? null,
    })
    .returning({ id: costRecords.id });
  return created.id;
}

export async function recordCostEstimate(db: Db, input: CostRecordInput): Promise<string> {
  return recordCost(db, { ...input, phase: "estimate", status: "success" });
}

export async function recordCostActual(db: Db, input: CostRecordInput): Promise<string> {
  return recordCost(db, { ...input, phase: "actual" });
}

export async function costByProviderModel(db: Db) {
  const rows = await db
    .select()
    .from(costRecords)
    .where(eq(costRecords.phase, "actual"));
  const grouped = new Map<
    string,
    { provider: string; model: string; total: number; count: number; errors: number }
  >();
  for (const row of rows) {
    const key = `${row.provider}:${row.model ?? "unknown"}`;
    const entry = grouped.get(key) ?? {
      provider: row.provider,
      model: row.model ?? "unknown",
      total: 0,
      count: 0,
      errors: 0,
    };
    entry.total += row.actualCost ?? 0;
    entry.count += 1;
    if (row.status === "error") entry.errors += 1;
    grouped.set(key, entry);
  }
  return [...grouped.values()].sort((a, b) => b.total - a.total);
}

export async function costBySeries(db: Db) {
  const rows = await db
    .select()
    .from(costRecords)
    .where(eq(costRecords.phase, "actual"));
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const key = row.seriesId ?? "unattributed";
    grouped.set(key, (grouped.get(key) ?? 0) + (row.actualCost ?? 0));
  }
  return [...grouped.entries()]
    .map(([seriesId, total]) => ({ seriesId, total }))
    .sort((a, b) => b.total - a.total);
}

export async function costByEpisode(db: Db, seriesId: string) {
  const rows = await db
    .select()
    .from(costRecords)
    .where(and(eq(costRecords.phase, "actual"), eq(costRecords.seriesId, seriesId)));
  const grouped = new Map<number, number>();
  for (const row of rows) {
    const episode = row.episodeNumber ?? 0;
    grouped.set(episode, (grouped.get(episode) ?? 0) + (row.actualCost ?? 0));
  }
  return [...grouped.entries()]
    .map(([episodeNumber, total]) => ({ episodeNumber, total }))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export async function getJobHealth(db: Db) {
  const rows = await db.select().from(jobs);
  const total = rows.length;
  const succeeded = rows.filter((j) => j.status === "succeeded").length;
  const failed = rows.filter((j) => j.status === "failed").length;
  const cancelled = rows.filter((j) => j.status === "cancelled").length;
  const active = rows.filter((j) => j.status === "queued" || j.status === "running").length;
  const now = Date.now();
  const stuck = rows.filter((j) =>
    isJobStuck(
      { status: j.status, updatedAt: j.updatedAt, attemptCount: j.attemptCount, maxAttempts: j.maxAttempts },
      now,
    ),
  ).length;
  const retried = rows.filter((j) => j.attemptCount > 1).length;
  const terminal = succeeded + failed;
  return {
    total,
    active,
    stuck,
    succeeded,
    failed,
    cancelled,
    successRate: terminal > 0 ? succeeded / terminal : 0,
    errorRate: terminal > 0 ? failed / terminal : 0,
    retryRate: total > 0 ? retried / total : 0,
  };
}

export async function getDurationStats(db: Db) {
  const attempts = await db
    .select()
    .from(jobAttempts)
    .where(isNotNull(jobAttempts.finishedAt));
  const durations = attempts
    .map((a) =>
      a.durationMs ??
      (a.startedAt && a.finishedAt ? new Date(a.finishedAt).getTime() - new Date(a.startedAt).getTime() : null),
    )
    .filter((d): d is number => typeof d === "number" && d >= 0);
  return {
    attemptsWithDuration: durations.length,
    avgDurationMs: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0,
    maxDurationMs: durations.length ? Math.max(...durations) : 0,
  };
}

export async function resolveJobContext(db: Db, jobId: string) {
  const [step] = await db
    .select()
    .from(generationSteps)
    .where(eq(generationSteps.jobId, jobId))
    .limit(1);
  if (!step) {
    return { seriesId: null, episodeNumber: null, sceneId: null, shotId: null };
  }
  const [shot] = await db.select().from(shots).where(eq(shots.id, step.shotId));
  if (!shot) {
    return { seriesId: null, episodeNumber: null, sceneId: null, shotId: step.shotId };
  }
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, shot.sceneId));
  return {
    seriesId: scene?.seriesId ?? null,
    episodeNumber: scene?.episodeNumber ?? null,
    sceneId: scene?.id ?? null,
    shotId: shot.id,
  };
}

export async function findFailedJobTrace(
  db: Db,
  opts: { seriesId?: string; episodeNumber?: number } = {},
) {
  let jobIds: string[] | null = null;
  if (opts.seriesId || opts.episodeNumber) {
    const conditions = [];
    if (opts.seriesId) conditions.push(eq(scenes.seriesId, opts.seriesId));
    if (opts.episodeNumber) conditions.push(eq(scenes.episodeNumber, opts.episodeNumber));
    const steps = await db
      .select({ jobId: generationSteps.jobId })
      .from(generationSteps)
      .innerJoin(shots, eq(generationSteps.shotId, shots.id))
      .innerJoin(scenes, eq(shots.sceneId, scenes.id))
      .where(and(...conditions));
    jobIds = steps.filter((s) => s.jobId).map((s) => s.jobId as string);
  }
  const rows = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "failed"),
        jobIds && jobIds.length > 0 ? inArray(jobs.id, jobIds) : undefined,
      ),
    )
    .orderBy(desc(jobs.updatedAt))
    .limit(100);
  const trace = [];
  for (const job of rows) {
    const attempts = await db
      .select()
      .from(jobAttempts)
      .where(eq(jobAttempts.jobId, job.id))
      .orderBy(desc(jobAttempts.attemptNumber));
    trace.push({ job, attempts });
  }
  return trace;
}

export async function detectOrphanOutputs(db: Db) {
  const assetRows = await db.select().from(assets);
  const generationIds = new Set((await db.select({ id: generations.id }).from(generations)).map((g) => g.id));
  return assetRows
    .filter((a) => a.generationId && !generationIds.has(a.generationId))
    .map((a) => ({ assetId: a.id, generationId: a.generationId, kind: a.kind, url: a.url }));
}

export async function reprocessJob(db: Db, jobId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) throw new Error("Job not found");
  if (job.status === "succeeded") throw new Error("Cannot reprocess a succeeded job");
  await db.transaction(async (tx) => {
    await tx
      .update(jobs)
      .set({ status: "queued", error: null, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
    await tx.insert(jobEvents).values({ jobId, type: "reprocessed", payload: {} });
  });
}

export async function cleanupJob(db: Db, jobId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) throw new Error("Job not found");
  if (job.status !== "queued" && job.status !== "running") {
    throw new Error(`Cannot clean a ${job.status} job`);
  }
  await db
    .update(jobs)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
  await db.insert(jobEvents).values({ jobId, type: "cancelled", payload: {} });
}

export async function checkBudget(
  db: Db,
  opts: { limitUsd: number; seriesId?: string },
) {
  const conditions = [eq(costRecords.phase, "actual")];
  if (opts.seriesId) conditions.push(eq(costRecords.seriesId, opts.seriesId));
  const rows = await db.select().from(costRecords).where(and(...conditions));
  const totalCost = rows.reduce((sum, row) => sum + (row.actualCost ?? 0), 0);
  return { totalCost, limitUsd: opts.limitUsd, over: totalCost > opts.limitUsd };
}
