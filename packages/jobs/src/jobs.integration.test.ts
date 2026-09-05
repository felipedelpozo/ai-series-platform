import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { jobs, schema, workspace, type Db } from "@ai-series/db";
import {
  enqueueActiveJob,
  enqueueJob,
  PaidJobNotReusableError,
  reconcilePaidJob,
  reconcilePaidJobInTransaction,
} from "./jobs";

const TEST_DB = "ai_series_jobs_test";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("job idempotency integration", () => {
  let db: Db;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sql = postgres(databaseUrl(TEST_DB), { max: 5 });
    db = drizzle(sql, { schema });
    await migrate(db, { migrationsFolder });
  });

  afterAll(async () => {
    await sql?.end();
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  });

  it("creates one job when the same paid action is submitted concurrently", async () => {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: "jobs-test", name: "Jobs Test" })
      .returning({ id: workspace.id });
    const input = {
      workspaceId: workspaceRow!.id,
      idempotencyKey: "shot:one:keyframe:step:initial",
      kind: "image",
      input: { templateId: "template", variables: {}, params: {} },
    };

    const [first, second] = await Promise.all([enqueueJob(db, input), enqueueJob(db, input)]);
    const rows = await db.select().from(jobs).where(eq(jobs.idempotencyKey, input.idempotencyKey));

    expect(first.id).toBe(second.id);
    expect([first.created, second.created].sort()).toEqual([false, true]);
    expect(rows).toHaveLength(1);
  });

  it("deduplicates different attempt tokens while a logical paid action is active", async () => {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: "active-jobs-test", name: "Active Jobs Test" })
      .returning({ id: workspace.id });
    const scope = "generation-lab:request-fingerprint";
    const base = {
      workspaceId: workspaceRow!.id,
      kind: "image",
      input: { templateId: "template", variables: {}, params: {} },
    };

    const [first, second] = await Promise.all([
      enqueueActiveJob(db, { ...base, idempotencyKey: `${scope}:tab-a` }, scope),
      enqueueActiveJob(db, { ...base, idempotencyKey: `${scope}:tab-b` }, scope),
    ]);
    let rows = await db
      .select()
      .from(jobs)
      .where(like(jobs.idempotencyKey, `${scope}:%`));

    expect(first.id).toBe(second.id);
    expect(rows).toHaveLength(1);

    await db.update(jobs).set({ status: "succeeded" }).where(eq(jobs.id, first.id));
    const later = await enqueueActiveJob(
      db,
      { ...base, idempotencyKey: `${scope}:intentional-later-attempt` },
      scope,
    );
    rows = await db
      .select()
      .from(jobs)
      .where(like(jobs.idempotencyKey, `${scope}:%`));

    expect(later.id).not.toBe(first.id);
    expect(later.created).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it("reconciles concurrent paid starts and reuses a completed durable result", async () => {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: "paid-jobs-test", name: "Paid Jobs Test" })
      .returning({ id: workspace.id });
    const input = {
      workspaceId: workspaceRow!.id,
      kind: "video",
      input: { proposalRevisionId: "revision", confirmationId: "confirmation" },
      model: "provider-model",
    };

    const starts = await Promise.all(
      Array.from({ length: 10 }, () => reconcilePaidJob(db, input, "approved-scope")),
    );
    expect(new Set(starts.map((start) => start.id)).size).toBe(1);
    expect(starts.filter((start) => start.created)).toHaveLength(1);

    const jobId = starts[0]!.id;
    await db.update(jobs).set({ status: "running" }).where(eq(jobs.id, jobId));
    expect(await reconcilePaidJob(db, input, "approved-scope")).toEqual({
      id: jobId,
      created: false,
      status: "running",
    });

    await db
      .update(jobs)
      .set({ status: "succeeded", output: { assetId: "canonical-asset" } })
      .where(eq(jobs.id, jobId));

    expect(await reconcilePaidJob(db, input, "approved-scope")).toEqual({
      id: jobId,
      created: false,
      status: "succeeded",
    });
  });

  it("isolates equal paid scopes by workspace", async () => {
    const created = await db
      .insert(workspace)
      .values([
        { slug: "paid-scope-a", name: "Paid Scope A" },
        { slug: "paid-scope-b", name: "Paid Scope B" },
      ])
      .returning({ id: workspace.id });
    const base = { kind: "image", input: { confirmationId: "same" } };

    const [left, right] = await Promise.all([
      reconcilePaidJob(db, { ...base, workspaceId: created[0]!.id }, "same-scope"),
      reconcilePaidJob(db, { ...base, workspaceId: created[1]!.id }, "same-scope"),
    ]);

    expect(left.id).not.toBe(right.id);
    expect(left.created).toBe(true);
    expect(right.created).toBe(true);
  });

  it("does not reuse failed or incomplete succeeded paid jobs", async () => {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: "paid-terminal-test", name: "Paid Terminal Test" })
      .returning({ id: workspace.id });
    const input = { workspaceId: workspaceRow!.id, kind: "image", input: {} };
    const first = await reconcilePaidJob(db, input, "failed-scope");
    await db.update(jobs).set({ status: "failed" }).where(eq(jobs.id, first.id));

    await expect(reconcilePaidJob(db, input, "failed-scope")).rejects.toBeInstanceOf(
      PaidJobNotReusableError,
    );

    const second = await reconcilePaidJob(db, input, "incomplete-scope");
    await db.update(jobs).set({ status: "succeeded", output: null }).where(eq(jobs.id, second.id));
    await expect(reconcilePaidJob(db, input, "incomplete-scope")).rejects.toBeInstanceOf(
      PaidJobNotReusableError,
    );
  });

  it("rolls job creation back with a caller transaction", async () => {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: "paid-rollback-test", name: "Paid Rollback Test" })
      .returning({ id: workspace.id });

    await expect(
      db.transaction(async (tx) => {
        await reconcilePaidJobInTransaction(
          tx,
          { workspaceId: workspaceRow!.id, kind: "image", input: {} },
          "rolled-back-scope",
        );
        throw new Error("abort operation");
      }),
    ).rejects.toThrow("abort operation");

    const rows = await db.select().from(jobs).where(eq(jobs.workspaceId, workspaceRow!.id));
    expect(rows).toHaveLength(0);
  });

  it("does not reveal a colliding global key from another workspace", async () => {
    const created = await db
      .insert(workspace)
      .values([
        { slug: "global-key-a", name: "Global Key A" },
        { slug: "global-key-b", name: "Global Key B" },
      ])
      .returning({ id: workspace.id });
    const first = await enqueueJob(db, {
      workspaceId: created[0]!.id,
      idempotencyKey: "legacy-global-collision",
      kind: "image",
      input: {},
    });

    await expect(
      enqueueJob(db, {
        workspaceId: created[1]!.id,
        idempotencyKey: "legacy-global-collision",
        kind: "image",
        input: {},
      }),
    ).rejects.toThrow("Idempotent job could not be resolved");
    expect(first.created).toBe(true);
  });
});
