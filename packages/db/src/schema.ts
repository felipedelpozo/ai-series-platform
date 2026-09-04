import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type PromptVariable = {
  name: string;
  required: boolean;
  default?: string;
};

export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  purpose: text("purpose").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  scopeType: text("scope_type").notNull().default("global"),
  scopeId: uuid("scope_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptVersions = pgTable(
  "prompt_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => promptTemplates.id),
    version: integer("version").notNull(),
    template: text("template").notNull(),
    variables: jsonb("variables").$type<PromptVariable[]>().notNull().default([]),
    outputContract: jsonb("output_contract").$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("prompt_versions_template_version_idx").on(table.templateId, table.version)],
);

export const promptSnapshots = pgTable("prompt_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").notNull(),
  versionId: uuid("version_id").notNull(),
  renderedText: text("rendered_text").notNull(),
  variables: jsonb("variables").$type<Record<string, string>>().notNull().default({}),
  model: text("model"),
  params: jsonb("params").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  purpose: text("purpose").notNull(),
  templateId: uuid("template_id"),
  versionId: uuid("version_id"),
  promptSnapshotId: uuid("prompt_snapshot_id"),
  provider: text("provider").notNull().default("fal"),
  model: text("model").notNull(),
  kind: text("kind").notNull().default("image"),
  status: text("status").notNull().default("queued"),
  requestId: text("request_id"),
  params: jsonb("params").$type<Record<string, unknown>>(),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  generationId: uuid("generation_id"),
  parentId: uuid("parent_id"),
  name: text("name"),
  kind: text("kind").notNull().default("image"),
  source: text("source").notNull().default("generated"),
  url: text("url"),
  mime: text("mime"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  sizeBytes: integer("size_bytes"),
  provider: text("provider"),
  model: text("model"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("queued"),
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  generationId: uuid("generation_id"),
  providerRequestId: text("provider_request_id"),
  model: text("model"),
  maxAttempts: integer("max_attempts").notNull().default(3),
  attemptCount: integer("attempt_count").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobAttempts = pgTable("job_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  attemptNumber: integer("attempt_number").notNull(),
  status: text("status").notNull().default("running"),
  providerRequestId: text("provider_request_id"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
});

export const jobEvents = pgTable("job_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const series = pgTable("series", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seriesBibles = pgTable(
  "series_bibles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id),
    version: integer("version").notNull(),
    title: text("title"),
    premise: text("premise"),
    genre: text("genre"),
    tone: text("tone"),
    audience: text("audience"),
    format: text("format"),
    language: text("language"),
    episodeDuration: text("episode_duration"),
    narrativeRules: jsonb("narrative_rules").$type<string[]>().notNull().default([]),
    visualStyle: text("visual_style"),
    canon: jsonb("canon").$type<string[]>().notNull().default([]),
    prohibitions: jsonb("prohibitions").$type<string[]>().notNull().default([]),
    description: text("description"),
    source: text("source").notNull().default("manual"),
    promptSnapshotId: uuid("prompt_snapshot_id"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("series_bibles_series_version_idx").on(table.seriesId, table.version)],
);

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  type: text("type").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const entityVersions = pgTable(
  "entity_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    source: text("source").notNull().default("manual"),
    promptSnapshotId: uuid("prompt_snapshot_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("entity_versions_entity_version_idx").on(table.entityId, table.version)],
);

export const referenceAssets = pgTable("reference_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  assetId: uuid("asset_id").notNull(),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referenceSheets = pgTable("reference_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id")
    .notNull()
    .references(() => entities.id),
  entityVersionId: uuid("entity_version_id").notNull(),
  jobId: uuid("job_id"),
  status: text("status").notNull().default("draft"),
  panels: text("panels"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
