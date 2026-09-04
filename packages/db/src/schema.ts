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
  kind: text("kind").notNull().default("image"),
  source: text("source").notNull().default("generated"),
  url: text("url"),
  mime: text("mime"),
  width: integer("width"),
  height: integer("height"),
  sizeBytes: integer("size_bytes"),
  provider: text("provider"),
  model: text("model"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
