import { and, desc, eq, inArray } from "drizzle-orm";
import { jobAttempts, jobEvents, jobs, type Db } from "@ai-series/db";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export function shouldRetry(retryable: boolean, attemptCount: number, maxAttempts: number): boolean {
  return Boolean(retryable) && attemptCount < maxAttempts;
}

export type EnqueueInput = {
  workspaceId: string;
  idempotencyKey: string;
  kind: string;
  input: Record<string, unknown>;
  generationId?: string;
  model?: string;
  maxAttempts?: number;
};

export async function enqueueJob(
  db: Db,
  input: EnqueueInput,
): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.idempotencyKey, input.idempotencyKey));
  if (existing) {
    return { id: existing.id, created: false };
  }
  const [job] = await db
    .insert(jobs)
    .values({
      workspaceId: input.workspaceId,
      idempotencyKey: input.idempotencyKey,
      kind: input.kind,
      input: input.input,
      generationId: input.generationId ?? null,
      model: input.model ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      status: "queued",
    })
    .returning({ id: jobs.id });
  return { id: job.id, created: true };
}

export async function claimNextJob(
  db: Db,
  kinds?: string[],
): Promise<{ job: typeof jobs.$inferSelect; attempt: typeof jobAttempts.$inferSelect } | null> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "queued"),
          kinds && kinds.length > 0 ? inArray(jobs.kind, kinds) : undefined,
        ),
      )
      .orderBy(jobs.createdAt)
      .limit(1)
      .for("update", { skipLocked: true });
    if (!job) {
      return null;
    }
    const [updated] = await tx
      .update(jobs)
      .set({ status: "running", attemptCount: job.attemptCount + 1, updatedAt: new Date() })
      .where(eq(jobs.id, job.id))
      .returning();
    const [attempt] = await tx
      .insert(jobAttempts)
      .values({ jobId: job.id, attemptNumber: updated.attemptCount, status: "running" })
      .returning();
    await tx.insert(jobEvents).values({ jobId: job.id, type: "claimed", payload: {} });
    return { job: updated, attempt };
  });
}

export async function completeJob(
  db: Db,
  jobId: string,
  output: Record<string, unknown>,
  attemptId?: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(jobs)
      .set({ status: "succeeded", output, error: null, updatedAt: new Date() })
      .where(eq(jobs.id, jobId));
    if (attemptId) {
      await tx
        .update(jobAttempts)
        .set({ status: "succeeded", finishedAt: new Date() })
        .where(eq(jobAttempts.id, attemptId));
    }
    await tx.insert(jobEvents).values({ jobId, type: "completed", payload: {} });
  });
}

export async function failJob(
  db: Db,
  jobId: string,
  error: string,
  opts: { retryable?: boolean; attemptId?: string } = {},
): Promise<void> {
  await db.transaction(async (tx) => {
    if (opts.attemptId) {
      await tx
        .update(jobAttempts)
        .set({ status: "failed", error, finishedAt: new Date() })
        .where(eq(jobAttempts.id, opts.attemptId));
    }
    const [job] = await tx.select().from(jobs).where(eq(jobs.id, jobId));
    if (!job) {
      return;
    }
    const retry = shouldRetry(Boolean(opts.retryable), job.attemptCount, job.maxAttempts);
    await tx
      .update(jobs)
      .set({
        status: retry ? "queued" : "failed",
        error: retry ? null : error,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
    await tx
      .insert(jobEvents)
      .values({ jobId, type: retry ? "retry" : "failed", payload: { error } });
  });
}

export async function cancelJob(db: Db, jobId: string): Promise<void> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) {
    throw new Error("Job not found");
  }
  if (job.status === "succeeded" || job.status === "failed") {
    throw new Error(`Cannot cancel a ${job.status} job`);
  }
  await db.update(jobs).set({ status: "cancelled", updatedAt: new Date() }).where(eq(jobs.id, jobId));
  await db.insert(jobEvents).values({ jobId, type: "cancelled", payload: {} });
}

export async function setJobGeneration(
  db: Db,
  jobId: string,
  generationId: string,
  providerRequestId?: string,
): Promise<void> {
  await db
    .update(jobs)
    .set({ generationId, providerRequestId: providerRequestId ?? null, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function recordEvent(
  db: Db,
  jobId: string,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(jobEvents).values({ jobId, type, payload });
}

export async function listJobs(db: Db, filters: { kind?: string; status?: string } = {}) {
  return db
    .select()
    .from(jobs)
    .where(
      and(
        filters.kind ? eq(jobs.kind, filters.kind) : undefined,
        filters.status ? eq(jobs.status, filters.status) : undefined,
      ),
    )
    .orderBy(desc(jobs.createdAt))
    .limit(100);
}

export async function getJobDetail(db: Db, id: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!job) {
    return null;
  }
  const attempts = await db
    .select()
    .from(jobAttempts)
    .where(eq(jobAttempts.jobId, id))
    .orderBy(desc(jobAttempts.attemptNumber));
  const events = await db
    .select()
    .from(jobEvents)
    .where(eq(jobEvents.jobId, id))
    .orderBy(desc(jobEvents.createdAt));
  return { job, attempts, events };
}
