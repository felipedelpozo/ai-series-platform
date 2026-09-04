import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { insertAuditLog } from "./audit";
import { checkDb, DatabaseConfigError, ensureDefaultWorkspace, getDb, type Db } from "./client";
import * as schema from "./schema";

const TEST_DB = "ai_series_test";
const migrationsFolder = join(import.meta.dirname, "..", "migrations");

function baseUrl(): string {
  return process.env.DATABASE_URL ?? "";
}

function maintenanceUrl(): string {
  const url = new URL(baseUrl());
  url.pathname = "/postgres";
  return url.toString();
}

function testUrl(): string {
  const url = new URL(baseUrl());
  url.pathname = `/${TEST_DB}`;
  return url.toString();
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("db integration", () => {
  let testDb: Db;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(maintenanceUrl(), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sql = postgres(testUrl(), { max: 1 });
    testDb = drizzle(sql, { schema });
    await migrate(testDb, { migrationsFolder });
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("migrates an empty database and seeds the default workspace", async () => {
    await ensureDefaultWorkspace(testDb);
    const rows = await testDb.select().from(schema.workspace).where(eq(schema.workspace.slug, "default"));
    expect(rows.length).toBe(1);
    expect(rows[0]!.name).toBe("Default Workspace");
  });

  it("seeds the default workspace idempotently", async () => {
    await ensureDefaultWorkspace(testDb);
    const rows = await testDb.select().from(schema.workspace).where(eq(schema.workspace.slug, "default"));
    expect(rows.length).toBe(1);
  });

  it("inserts and reads an audit record", async () => {
    const id = await insertAuditLog(testDb, {
      actor: "system",
      action: "test.action",
      entityType: "workspace",
      entityId: "00000000-0000-0000-0000-000000000000",
      metadata: { reason: "integration test" },
    });
    const rows = await testDb.select().from(schema.auditLog).where(eq(schema.auditLog.id, id));
    expect(rows.length).toBe(1);
    expect(rows[0]!.action).toBe("test.action");
  });

  it("reports database health", async () => {
    const health = await checkDb(testUrl());
    expect(health.ok).toBe(true);
  });

  it("fails with DatabaseConfigError on a malformed URL", () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "not-a-url";
    try {
      expect(() => getDb()).toThrow(DatabaseConfigError);
    } finally {
      process.env.DATABASE_URL = original;
    }
  });

  it("does not leak credentials in DatabaseConfigError", () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "https://user:supersecret@host/db";
    try {
      let caught: unknown;
      try {
        getDb();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(DatabaseConfigError);
      expect((caught as Error).message).not.toContain("supersecret");
    } finally {
      process.env.DATABASE_URL = original;
    }
  });
});
