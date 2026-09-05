import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import {
  entities,
  entityVersions,
  jobs,
  promptTemplates,
  promptVersions,
  referenceSheets,
  schema,
  series,
  workspace,
  type Db,
} from "@ai-series/db";
import { generateReferenceSheet } from "./references";

const TEST_DB = "ai_series_references_test";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("reference sheet idempotency integration", () => {
  let db: Db;
  let sqlClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sqlClient = postgres(databaseUrl(TEST_DB), { max: 5 });
    db = drizzle(sqlClient, { schema });
    await migrate(db, { migrationsFolder });
  });

  afterAll(async () => {
    await sqlClient?.end();
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  });

  it("reuses an active paid sheet job across concurrent attempt tokens", async () => {
    let [workspaceRow] = await db.select().from(workspace).where(eq(workspace.slug, "default"));
    if (!workspaceRow) {
      [workspaceRow] = await db
        .insert(workspace)
        .values({ slug: "default", name: "Default" })
        .returning();
    }
    const [seriesRow] = await db
      .insert(series)
      .values({ workspaceId: workspaceRow!.id, name: "Reference Test", slug: "reference-test" })
      .returning();
    const [entity] = await db
      .insert(entities)
      .values({ seriesId: seriesRow!.id, type: "character", name: "Ada" })
      .returning();
    await db.insert(entityVersions).values({
      entityId: entity!.id,
      version: 1,
      name: "Ada",
      data: {},
      isActive: true,
    });
    const [template] = await db
      .insert(promptTemplates)
      .values({
        workspaceId: workspaceRow!.id,
        purpose: "reference.sheet",
        name: "Reference Sheet",
      })
      .returning();
    await db.insert(promptVersions).values({
      templateId: template!.id,
      version: 1,
      template: "Reference {{entity_name}} as {{entity_type}} with {{panels}}.",
      variables: [
        { name: "entity_name", required: true },
        { name: "entity_type", required: true },
        { name: "panels", required: true },
      ],
      isActive: true,
    });

    const [first, second] = await Promise.all([
      generateReferenceSheet(db, { entityId: entity!.id, idempotencyKey: "tab-a" }),
      generateReferenceSheet(db, { entityId: entity!.id, idempotencyKey: "tab-b" }),
    ]);
    const activeRows = await db
      .select()
      .from(jobs)
      .where(like(jobs.idempotencyKey, "reference-sheet:%"));
    const sheets = await db
      .select()
      .from(referenceSheets)
      .where(eq(referenceSheets.entityId, entity!.id));

    expect(first).toEqual(second);
    expect(activeRows).toHaveLength(1);
    expect(sheets).toHaveLength(1);
  });
});
