import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import {
  assets,
  generations,
  promptTemplates,
  promptVersions,
  schema,
  workspace,
  type Db,
} from "@ai-series/db";

let imageSubmissions = 0;
let imageStatusReads = 0;
let videoSubmissions = 0;
let videoStatusReads = 0;
let imageUploads = 0;

mock.module("@ai-series/fal", () => ({
  DEFAULT_IMAGE_MODEL: "mock-image-model",
  DEFAULT_VIDEO_MODEL_I2V: "mock-video-i2v-model",
  DEFAULT_VIDEO_MODEL_T2V: "mock-video-t2v-model",
  submitImage: async () => {
    imageSubmissions += 1;
    return { requestId: `image-request-${imageSubmissions}` };
  },
  imageStatus: async () => {
    imageStatusReads += 1;
    return { status: "IN_QUEUE" as const };
  },
  imageResult: async () => ({ images: [] }),
  submitVideo: async () => {
    videoSubmissions += 1;
    return { requestId: `video-request-${videoSubmissions}` };
  },
  uploadImage: async () => {
    imageUploads += 1;
    return "https://example.invalid/source.png";
  },
  videoStatus: async () => {
    videoStatusReads += 1;
    return { status: "IN_QUEUE" as const };
  },
  videoResult: async () => ({
    video: { url: "https://example.invalid/video.mp4", content_type: "video/mp4" },
  }),
}));

const { pollImageGeneration, pollVideoGeneration, startImageGeneration, startVideoGeneration } =
  await import("./index");

const TEST_DB = "ai_series_generation_tenant_test";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("generation tenant isolation", () => {
  let db: Db;
  let sqlClient: ReturnType<typeof postgres>;
  let workspaceA: string;
  let workspaceB: string;
  let templateA: string;
  let versionA: string;
  let versionB: string;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sqlClient = postgres(databaseUrl(TEST_DB), { max: 5 });
    db = drizzle(sqlClient, { schema });
    await migrate(db, { migrationsFolder });

    const workspaces = await db
      .insert(workspace)
      .values([
        { slug: "generation-tenant-a", name: "Generation Tenant A" },
        { slug: "generation-tenant-b", name: "Generation Tenant B" },
      ])
      .returning({ id: workspace.id });
    workspaceA = workspaces[0]!.id;
    workspaceB = workspaces[1]!.id;

    const templates = await db
      .insert(promptTemplates)
      .values([
        {
          workspaceId: workspaceA,
          purpose: "keyframe",
          name: "Tenant A prompt",
          status: "active",
        },
        {
          workspaceId: workspaceB,
          purpose: "keyframe",
          name: "Tenant B prompt",
          status: "active",
        },
      ])
      .returning({ id: promptTemplates.id, workspaceId: promptTemplates.workspaceId });
    templateA = templates.find((template) => template.workspaceId === workspaceA)!.id;
    const templateB = templates.find((template) => template.workspaceId === workspaceB)!.id;

    const versions = await db
      .insert(promptVersions)
      .values([
        {
          templateId: templateA,
          version: 1,
          template: "Portrait of {{subject}}",
          variables: [{ name: "subject", required: true }],
          isActive: true,
        },
        {
          templateId: templateB,
          version: 1,
          template: "Animate {{subject}}",
          variables: [{ name: "subject", required: true }],
          isActive: true,
        },
      ])
      .returning({ id: promptVersions.id, templateId: promptVersions.templateId });
    versionA = versions.find((version) => version.templateId === templateA)!.id;
    versionB = versions.find((version) => version.templateId === templateB)!.id;
  });

  afterAll(async () => {
    await sqlClient?.end();
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  });

  beforeEach(() => {
    imageSubmissions = 0;
    imageStatusReads = 0;
    videoSubmissions = 0;
    videoStatusReads = 0;
    imageUploads = 0;
  });

  it("persists an image generation in the explicit workspace", async () => {
    const started = await startImageGeneration(db, {
      workspaceId: workspaceA,
      versionId: versionA,
      variables: { subject: "Ada" },
    });
    const [generation] = await db.select().from(generations).where(eq(generations.id, started.id));

    expect(generation!.workspaceId).toBe(workspaceA);
    expect(imageSubmissions).toBe(1);
  });

  it("rejects prompt versions and templates owned by another workspace", async () => {
    await expect(
      startImageGeneration(db, {
        workspaceId: workspaceB,
        versionId: versionA,
        variables: { subject: "Ada" },
      }),
    ).rejects.toThrow("No prompt version found");
    await expect(
      startImageGeneration(db, {
        workspaceId: workspaceB,
        templateId: templateA,
        variables: { subject: "Ada" },
      }),
    ).rejects.toThrow("No prompt version found");
    expect(imageSubmissions).toBe(0);
  });

  it("rejects an image source owned by another workspace before upload or submission", async () => {
    const [foreignAsset] = await db
      .insert(assets)
      .values({
        workspaceId: workspaceA,
        kind: "image",
        source: "upload",
        mime: "image/png",
        status: "draft",
      })
      .returning({ id: assets.id });

    await expect(
      startVideoGeneration(db, {
        workspaceId: workspaceB,
        versionId: versionB,
        variables: { subject: "Ada" },
        sourceAssetId: foreignAsset!.id,
      }),
    ).rejects.toThrow("Source asset not found or is not an image");
    expect(imageUploads).toBe(0);
    expect(videoSubmissions).toBe(0);
  });

  it("persists a video generation in the explicit workspace", async () => {
    const started = await startVideoGeneration(db, {
      workspaceId: workspaceB,
      versionId: versionB,
      variables: { subject: "Ada" },
    });
    const [generation] = await db.select().from(generations).where(eq(generations.id, started.id));

    expect(generation!.workspaceId).toBe(workspaceB);
    expect(videoSubmissions).toBe(1);

    await expect(pollVideoGeneration(db, workspaceA, started.id)).rejects.toThrow(
      "Generation not found",
    );
    expect(videoStatusReads).toBe(0);
  });

  it("does not poll a generation through a foreign workspace", async () => {
    const started = await startImageGeneration(db, {
      workspaceId: workspaceA,
      versionId: versionA,
      variables: { subject: "Ada" },
    });

    await expect(pollImageGeneration(db, workspaceB, started.id)).rejects.toThrow(
      "Generation not found",
    );
    expect(imageStatusReads).toBe(0);
  });
});
