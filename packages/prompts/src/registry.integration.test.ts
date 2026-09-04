import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import {
  assets,
  auditLog,
  ensureDefaultWorkspace,
  generations,
  jobAttempts,
  jobEvents,
  jobs,
  promptSnapshots,
  promptTemplates,
  promptVersions,
  workspace,
  type Db,
} from "@ai-series/db";
import {
  activatePromptVersion,
  archivePromptTemplate,
  clonePromptTemplate,
  createPromptTemplate,
  editPromptTemplate,
  getPromptDetail,
  listPromptTemplates,
  savePromptSnapshot,
} from "./registry";
import { seedPrompts } from "./seed";

const TEST_DB = "ai_series_platform_test_prompts";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");

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

describe.skipIf(!hasDb)("prompt registry integration", () => {
  let db: Db;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(maintenanceUrl(), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sql = postgres(testUrl(), { max: 1 });
    db = drizzle(sql, {
      schema: {
        workspace,
        auditLog,
        promptTemplates,
        promptVersions,
        promptSnapshots,
        generations,
        assets,
        jobs,
        jobAttempts,
        jobEvents,
      },
    });
    await migrate(db, { migrationsFolder });
    await ensureDefaultWorkspace(db);
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("creates a template with an active version 1", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "test.image",
      name: "My Image",
      template: "A {{subject}} in {{style}}",
      variables: [
        { name: "subject", required: true },
        { name: "style", required: false },
      ],
    });
    const detail = await getPromptDetail(db, created.id);
    expect(detail).not.toBeNull();
    expect(detail!.versions.length).toBe(1);
    expect(detail!.versions[0]!.isActive).toBe(true);
  });

  it("editing creates a new version without mutating history", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "test.video",
      name: "V",
      template: "v1 {{x}}",
      variables: [{ name: "x", required: true }],
    });
    await editPromptTemplate(db, created.id, {
      name: "V",
      template: "v2 {{x}}",
      variables: [{ name: "x", required: true }],
    });
    const detail = await getPromptDetail(db, created.id);
    expect(detail!.versions.length).toBe(2);
    expect(detail!.versions.filter((v) => v.isActive).length).toBe(1);
    expect(detail!.versions.find((v) => v.isActive)!.template).toBe("v2 {{x}}");
    expect(detail!.versions.find((v) => v.version === 1)!.template).toBe("v1 {{x}}");
  });

  it("activates an older version", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "shot.plan",
      name: "S",
      template: "a",
      variables: [],
    });
    await editPromptTemplate(db, created.id, { name: "S", template: "b", variables: [] });
    const detail = await getPromptDetail(db, created.id);
    const v1 = detail!.versions.find((v) => v.version === 1)!;
    await activatePromptVersion(db, v1.id);
    const after = await getPromptDetail(db, created.id);
    expect(after!.versions.find((v) => v.isActive)!.version).toBe(1);
  });

  it("clones a template independently", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "scene.plan",
      name: "Original",
      template: "x",
      variables: [],
    });
    const clone = await clonePromptTemplate(db, created.id);
    expect(clone.id).not.toBe(created.id);
  });

  it("archives a template", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "episode.plan",
      name: "E",
      template: "x",
      variables: [],
    });
    await archivePromptTemplate(db, created.id);
    const detail = await getPromptDetail(db, created.id);
    expect(detail!.template.status).toBe("archived");
  });

  it("saves an immutable snapshot", async () => {
    const created = await createPromptTemplate(db, {
      purpose: "image.generate",
      name: "I",
      template: "{{subject}}",
      variables: [{ name: "subject", required: true }],
    });
    const detail = await getPromptDetail(db, created.id);
    const active = detail!.versions.find((v) => v.isActive)!;
    const snapshot = await savePromptSnapshot(db, {
      versionId: active.id,
      variables: { subject: "cat" },
      model: "test-model",
      params: { seed: 1 },
    });
    expect(snapshot.id).toBeTruthy();
  });

  it("seeds test.image and test.video idempotently", async () => {
    await seedPrompts(db);
    await seedPrompts(db);
    const list = await listPromptTemplates(db);
    const seeds = list.filter((t) => t.purpose === "test.image" || t.purpose === "test.video");
    expect(seeds.length).toBe(2);
  });
});
