import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { jobs, schema, workspace, type Db } from "@ai-series/db";
import { enqueueActiveJob, enqueueJob } from "./jobs";

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
});
