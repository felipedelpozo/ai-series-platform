import { createHash } from "node:crypto";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { jobAttempts, jobEvents, jobs, type Db } from "@ai-series/db";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export function shouldRetry(
  retryable: boolean,
  attemptCount: number,
  maxAttempts: number,
): boolean {
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

export type PaidJobInput = Omit<EnqueueInput, "idempotencyKey">;
export type JobTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type ReconciledPaidJob = {
  id: string;
  created: boolean;
  status: Extract<JobStatus, "queued" | "running" | "succeeded">;
};

export class PaidJobNotReusableError extends Error {
  constructor() {
    super("Paid job is not reusable");
    this.name = "PaidJobNotReusableError";
  }
}

function paidJobIdempotencyKey(input: PaidJobInput, scope: string): string {
  const digest = createHash("sha256")
    .update(JSON.stringify([input.workspaceId, input.kind, scope]))
    .digest("hex");
  return `paid:${input.workspaceId}:${digest}`;
}

export async function enqueueJob(
  db: Db,
  input: EnqueueInput,
): Promise<{ id: string; created: boolean }> {
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
    .onConflictDoNothing({ target: jobs.idempotencyKey })
    .returning({ id: jobs.id });
  if (job) return { id: job.id, created: true };

  const [existing] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(eq(jobs.workspaceId, input.workspaceId), eq(jobs.idempotencyKey, input.idempotencyKey)),
    );
  if (!existing) throw new Error("Idempotent job could not be resolved");
  return { id: existing.id, created: false };
}

/**
 * Reconciles one exact paid operation within a workspace.
 *
 * The caller supplies a server-derived scope bound to the approved operation
 * and cost confirmation. A queued/running job is returned as the in-flight
 * effect; a succeeded job is reusable only when it has durable output. Failed,
 * cancelled, or incomplete succeeded jobs require a new confirmed scope.
 */
export async function reconcilePaidJob(
  db: Db,
  input: PaidJobInput,
  scope: string,
): Promise<ReconciledPaidJob> {
  return db.transaction((tx) => reconcilePaidJobInTransaction(tx, input, scope));
}

/** Transaction-aware variant for atomic quota reservation plus job creation. */
export async function reconcilePaidJobInTransaction(
  tx: JobTransaction,
  input: PaidJobInput,
  scope: string,
): Promise<ReconciledPaidJob> {
  if (scope.trim().length === 0) {
    throw new Error("Paid job scope is required");
  }

  const idempotencyKey = paidJobIdempotencyKey(input, scope);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`);

  const [existing] = await tx
    .select({ id: jobs.id, status: jobs.status, output: jobs.output })
    .from(jobs)
    .where(and(eq(jobs.workspaceId, input.workspaceId), eq(jobs.idempotencyKey, idempotencyKey)))
    .limit(1);

  if (existing) {
    if (existing.status === "queued" || existing.status === "running") {
      return { id: existing.id, created: false, status: existing.status };
    }
    if (existing.status === "succeeded" && existing.output !== null) {
      return { id: existing.id, created: false, status: "succeeded" };
    }
    throw new PaidJobNotReusableError();
  }

  const [created] = await tx
    .insert(jobs)
    .values({
      ...input,
      idempotencyKey,
      generationId: input.generationId ?? null,
      model: input.model ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      status: "queued",
    })
    .returning({ id: jobs.id });
  if (!created) {
    throw new Error("Paid job could not be created");
  }
  return { id: created.id, created: true, status: "queued" };
}

export async function enqueueActiveJob(
  db: Db,
  input: EnqueueInput,
  scope: string,
): Promise<{ id: string; created: boolean }> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.workspaceId}:${scope}`}, 0))`,
    );
    const [active] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(
        and(
          eq(jobs.workspaceId, input.workspaceId),
          eq(jobs.kind, input.kind),
          inArray(jobs.status, ["queued", "running"]),
          like(jobs.idempotencyKey, `${scope}:%`),
        ),
      )
      .orderBy(desc(jobs.createdAt))
      .limit(1);
    if (active) return { id: active.id, created: false };
    return enqueueJob(tx, input);
  });
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
  await db
    .update(jobs)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
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
