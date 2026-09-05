import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  (table) => [
    uniqueIndex("prompt_versions_template_version_idx").on(table.templateId, table.version),
  ],
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

export const jobs = pgTable(
  "jobs",
  {
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
  },
  (table) => [
    unique("jobs_id_workspace_unique").on(table.id, table.workspaceId),
    index("jobs_workspace_status_created_idx").on(table.workspaceId, table.status, table.createdAt),
  ],
);

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

export const series = pgTable(
  "series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("series_workspace_slug_idx").on(table.workspaceId, table.slug),
    unique("series_id_workspace_unique").on(table.id, table.workspaceId),
    index("series_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

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

export const storyStates = pgTable("story_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  version: integer("version").notNull(),
  kind: text("kind").notNull().default("before"),
  episode: integer("episode"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const episodePlans = pgTable(
  "episode_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id),
    episodeNumber: integer("episode_number").notNull(),
    version: integer("version").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("draft"),
    source: text("source").notNull().default("manual"),
    promptSnapshotId: uuid("prompt_snapshot_id"),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("episode_plans_id_series_unique").on(table.id, table.seriesId),
    uniqueIndex("episode_plans_series_episode_version_idx").on(
      table.seriesId,
      table.episodeNumber,
      table.version,
    ),
  ],
);

export const scenes = pgTable("scenes", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  planId: uuid("plan_id")
    .notNull()
    .references(() => episodePlans.id),
  episodeNumber: integer("episode_number").notNull(),
  order: integer("order").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shots = pgTable("shots", {
  id: uuid("id").primaryKey().defaultRandom(),
  sceneId: uuid("scene_id")
    .notNull()
    .references(() => scenes.id),
  order: integer("order").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generationSteps = pgTable(
  "generation_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shotId: uuid("shot_id")
      .notNull()
      .references(() => shots.id),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("pending"),
    jobId: uuid("job_id"),
    promptSnapshotId: uuid("prompt_snapshot_id"),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("generation_steps_shot_kind_idx").on(table.shotId, table.kind)],
);

export const directorSessions = pgTable("director_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  shotId: uuid("shot_id")
    .notNull()
    .references(() => shots.id),
  status: text("status").notNull().default("idle"),
  initialPrompt: text("initial_prompt"),
  aspectRatio: text("aspect_ratio"),
  resolution: text("resolution"),
  memory: text("memory"),
  promptVersion: integer("prompt_version").notNull().default(0),
  currentPrompt: text("current_prompt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comfyWorkflows = pgTable("comfy_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1"),
  params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("registered"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qaFindings = pgTable("qa_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => episodePlans.id),
  shotId: uuid("shot_id"),
  check: text("check").notNull(),
  severity: text("severity").notNull(),
  evidence: text("evidence"),
  target: text("target"),
  repair: text("repair"),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const audioTracks = pgTable("audio_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  shotId: uuid("shot_id"),
  kind: text("kind").notNull().default("voice"),
  status: text("status").notNull().default("pending"),
  text: text("text"),
  voice: text("voice"),
  assetId: uuid("asset_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const episodeExports = pgTable("episode_exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => episodePlans.id),
  status: text("status").notNull().default("pending"),
  assetId: uuid("asset_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interactionWindows = pgTable("interaction_windows", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  episodeNumber: integer("episode_number").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const audienceSignals = pgTable(
  "audience_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id),
    episodeNumber: integer("episode_number").notNull(),
    windowId: uuid("window_id"),
    platform: text("platform").notNull(),
    sourceId: text("source_id").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default({}),
    comment: text("comment"),
    liked: boolean("liked").notNull().default(false),
    reaction: text("reaction"),
    replyTo: text("reply_to"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isSpam: boolean("is_spam").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("audience_signals_platform_source_idx").on(table.platform, table.sourceId),
  ],
);

export const audienceDecisions = pgTable("audience_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  episodeNumber: integer("episode_number").notNull(),
  windowId: uuid("window_id"),
  status: text("status").notNull().default("proposed"),
  title: text("title"),
  summary: text("summary"),
  rationale: text("rationale"),
  confidence: real("confidence").notNull().default(0),
  rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default({}),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  classifySnapshotId: uuid("classify_snapshot_id"),
  decideSnapshotId: uuid("decide_snapshot_id"),
  winningCandidateId: uuid("winning_candidate_id"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisionCandidates = pgTable("decision_candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  decisionId: uuid("decision_id")
    .notNull()
    .references(() => audienceDecisions.id),
  label: text("label").notNull(),
  summary: text("summary"),
  intent: text("intent").notNull().default("suggestion"),
  signalIds: jsonb("signal_ids").$type<string[]>().notNull().default([]),
  signalCount: integer("signal_count").notNull().default(0),
  score: real("score").notNull().default(0),
  isWinner: boolean("is_winner").notNull().default(false),
  rationale: text("rationale"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable("branches", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  name: text("name").notNull(),
  parentBranchId: uuid("parent_branch_id"),
  baseEpisode: integer("base_episode").notNull(),
  isCanonical: boolean("is_canonical").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const episodeLoops = pgTable("episode_loops", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  decisionId: uuid("decision_id").notNull(),
  branchId: uuid("branch_id"),
  fromEpisode: integer("from_episode").notNull(),
  toEpisode: integer("to_episode").notNull(),
  storyStateVersionBefore: integer("story_state_version_before"),
  storyStateVersionAfter: integer("story_state_version_after"),
  planId: uuid("plan_id"),
  status: text("status").notNull().default("draft"),
  transition: jsonb("transition").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tiktokAccounts = pgTable("tiktok_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  platformUsername: text("platform_username"),
  providerAccountId: text("provider_account_id"),
  status: text("status").notNull().default("manual"),
  capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
  linkedAt: timestamp("linked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tiktokVideos = pgTable("tiktok_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  episodeNumber: integer("episode_number").notNull(),
  providerVideoId: text("provider_video_id"),
  url: text("url"),
  status: text("status").notNull().default("associated"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const engagementImports = pgTable("engagement_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id),
  episodeNumber: integer("episode_number").notNull(),
  source: text("source").notNull().default("manual"),
  status: text("status").notNull().default("imported"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  signalCount: integer("signal_count").notNull().default(0),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const costRecords = pgTable("cost_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  jobId: uuid("job_id"),
  generationId: uuid("generation_id"),
  seriesId: uuid("series_id"),
  episodeNumber: integer("episode_number"),
  sceneId: uuid("scene_id"),
  shotId: uuid("shot_id"),
  provider: text("provider").notNull(),
  model: text("model"),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("success"),
  phase: text("phase").notNull().default("actual"),
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost"),
  durationMs: integer("duration_ms"),
  correlationId: text("correlation_id"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
  ],
);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  invitedBy: uuid("invited_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceQuotas = pgTable("workspace_quotas", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspace.id),
  monthlyLimit: integer("monthly_limit").notNull().default(1000),
  creditsUsed: integer("credits_used").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceSettings = pgTable("workspace_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .unique()
    .references(() => workspace.id),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const copilotConversations = pgTable(
  "copilot_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    nextSequence: integer("next_sequence").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_conversations_id_workspace_unique").on(table.id, table.workspaceId),
    index("copilot_conversations_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
    index("copilot_conversations_creator_created_idx").on(table.createdByUserId, table.createdAt),
    check(
      "copilot_conversations_title_check",
      sql`char_length(trim(${table.title})) between 1 and 160`,
    ),
    check("copilot_conversations_status_check", sql`${table.status} in ('active', 'archived')`),
    check("copilot_conversations_sequence_check", sql`${table.nextSequence} > 0`),
  ],
);

export const copilotContextSnapshots = pgTable(
  "copilot_context_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    seriesId: uuid("series_id"),
    episodePlanId: uuid("episode_plan_id"),
    episodeNumber: integer("episode_number"),
    resourceType: text("resource_type"),
    resourceId: uuid("resource_id"),
    canonicalBases: jsonb("canonical_bases").$type<unknown[]>().notNull().default([]),
    fingerprint: text("fingerprint").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_contexts_id_workspace_unique").on(table.id, table.workspaceId),
    unique("copilot_contexts_id_conversation_workspace_unique").on(
      table.id,
      table.conversationId,
      table.workspaceId,
    ),
    foreignKey({
      columns: [table.conversationId, table.workspaceId],
      foreignColumns: [copilotConversations.id, copilotConversations.workspaceId],
      name: "copilot_contexts_conversation_workspace_fk",
    }),
    foreignKey({
      columns: [table.seriesId, table.workspaceId],
      foreignColumns: [series.id, series.workspaceId],
      name: "copilot_contexts_series_workspace_fk",
    }),
    foreignKey({
      columns: [table.episodePlanId, table.seriesId],
      foreignColumns: [episodePlans.id, episodePlans.seriesId],
      name: "copilot_contexts_plan_series_fk",
    }),
    index("copilot_contexts_conversation_created_idx").on(table.conversationId, table.createdAt),
    index("copilot_contexts_workspace_series_idx").on(table.workspaceId, table.seriesId),
    index("copilot_contexts_episode_plan_idx").on(table.episodePlanId),
    check("copilot_contexts_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
    check(
      "copilot_contexts_resource_pair_check",
      sql`(${table.resourceType} is null) = (${table.resourceId} is null)`,
    ),
    check(
      "copilot_contexts_episode_scope_check",
      sql`${table.episodePlanId} is null or ${table.seriesId} is not null`,
    ),
  ],
);

export const copilotMessages = pgTable(
  "copilot_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    sequence: integer("sequence").notNull(),
    clientMessageId: text("client_message_id"),
    role: text("role").notNull(),
    classification: text("classification").notNull(),
    content: text("content").notNull(),
    contextSnapshotId: uuid("context_snapshot_id"),
    structuredRefs: jsonb("structured_refs").$type<Record<string, unknown>>().notNull().default({}),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_messages_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_messages_conversation_sequence_idx").on(
      table.conversationId,
      table.sequence,
    ),
    uniqueIndex("copilot_messages_client_key_idx")
      .on(table.conversationId, table.clientMessageId)
      .where(sql`${table.clientMessageId} is not null`),
    foreignKey({
      columns: [table.conversationId, table.workspaceId],
      foreignColumns: [copilotConversations.id, copilotConversations.workspaceId],
      name: "copilot_messages_conversation_workspace_fk",
    }),
    foreignKey({
      columns: [table.contextSnapshotId, table.conversationId, table.workspaceId],
      foreignColumns: [
        copilotContextSnapshots.id,
        copilotContextSnapshots.conversationId,
        copilotContextSnapshots.workspaceId,
      ],
      name: "copilot_messages_context_workspace_fk",
    }),
    index("copilot_messages_conversation_created_idx").on(table.conversationId, table.createdAt),
    check("copilot_messages_sequence_check", sql`${table.sequence} > 0`),
    check("copilot_messages_content_check", sql`char_length(${table.content}) between 1 and 50000`),
    check("copilot_messages_role_check", sql`${table.role} in ('user', 'assistant', 'system')`),
    check(
      "copilot_messages_classification_check",
      sql`${table.classification} in ('query', 'proposal', 'canonical_mutation', 'paid_job', 'mixed')`,
    ),
    check(
      "copilot_messages_user_client_key_check",
      sql`${table.role} <> 'user' or ${table.clientMessageId} is not null`,
    ),
  ],
);

export const copilotEvents = pgTable(
  "copilot_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    sequence: integer("sequence").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_events_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_events_conversation_sequence_idx").on(
      table.conversationId,
      table.sequence,
    ),
    foreignKey({
      columns: [table.conversationId, table.workspaceId],
      foreignColumns: [copilotConversations.id, copilotConversations.workspaceId],
      name: "copilot_events_conversation_workspace_fk",
    }),
    index("copilot_events_workspace_created_idx").on(table.workspaceId, table.createdAt),
    check("copilot_events_sequence_check", sql`${table.sequence} > 0`),
  ],
);

export const copilotProposals = pgTable(
  "copilot_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    contextSnapshotId: uuid("context_snapshot_id").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    intent: text("intent").notNull(),
    status: text("status").notNull().default("collecting_context"),
    currentRevisionId: uuid("current_revision_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_proposals_id_workspace_unique").on(table.id, table.workspaceId),
    foreignKey({
      columns: [table.conversationId, table.workspaceId],
      foreignColumns: [copilotConversations.id, copilotConversations.workspaceId],
      name: "copilot_proposals_conversation_workspace_fk",
    }),
    foreignKey({
      columns: [table.contextSnapshotId, table.conversationId, table.workspaceId],
      foreignColumns: [
        copilotContextSnapshots.id,
        copilotContextSnapshots.conversationId,
        copilotContextSnapshots.workspaceId,
      ],
      name: "copilot_proposals_context_workspace_fk",
    }),
    index("copilot_proposals_conversation_status_idx").on(table.conversationId, table.status),
    index("copilot_proposals_workspace_status_idx").on(table.workspaceId, table.status),
    check(
      "copilot_proposals_intent_check",
      sql`${table.intent} in ('canonical_mutation', 'paid_job', 'mixed')`,
    ),
    check(
      "copilot_proposals_status_check",
      sql`${table.status} in ('collecting_context', 'preparing_draft', 'ready_for_review', 'awaiting_approval', 'applying', 'applied', 'needs_information', 'continuity_conflict', 'stale_draft', 'recoverable_error', 'rejected', 'discarded')`,
    ),
  ],
);

export const copilotProposalRevisions = pgTable(
  "copilot_proposal_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    revisionNumber: integer("revision_number").notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    canonicalBases: jsonb("canonical_bases").$type<unknown[]>().notNull().default([]),
    diff: jsonb("diff").$type<unknown[]>().notNull().default([]),
    clientRevisionId: text("client_revision_id").notNull(),
    contentFingerprint: text("content_fingerprint").notNull(),
    fingerprint: text("fingerprint").notNull(),
    validationStatus: text("validation_status").notNull().default("pending"),
    promptSnapshotId: uuid("prompt_snapshot_id").references(() => promptSnapshots.id),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_revisions_id_workspace_unique").on(table.id, table.workspaceId),
    unique("copilot_revisions_id_proposal_workspace_unique").on(
      table.id,
      table.proposalId,
      table.workspaceId,
    ),
    uniqueIndex("copilot_revisions_number_idx").on(table.proposalId, table.revisionNumber),
    uniqueIndex("copilot_revisions_client_key_idx").on(table.proposalId, table.clientRevisionId),
    uniqueIndex("copilot_revisions_fingerprint_idx").on(table.proposalId, table.fingerprint),
    foreignKey({
      columns: [table.proposalId, table.workspaceId],
      foreignColumns: [copilotProposals.id, copilotProposals.workspaceId],
      name: "copilot_revisions_proposal_workspace_fk",
    }),
    index("copilot_revisions_proposal_created_idx").on(table.proposalId, table.createdAt),
    check("copilot_revisions_number_check", sql`${table.revisionNumber} > 0`),
    check("copilot_revisions_schema_check", sql`${table.schemaVersion} > 0`),
    check(
      "copilot_revisions_content_fingerprint_check",
      sql`${table.contentFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check("copilot_revisions_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
    check(
      "copilot_revisions_validation_status_check",
      sql`${table.validationStatus} in ('pending', 'valid', 'valid_with_warnings', 'invalid', 'stale')`,
    ),
  ],
);

export const copilotRevisionTargets = pgTable(
  "copilot_revision_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revisionId: uuid("revision_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    ordinal: integer("ordinal").notNull(),
    resourceType: text("resource_type").notNull(),
    operation: text("operation").notNull(),
    dependencies: jsonb("dependencies").$type<string[]>().notNull().default([]),
    executionDependency: text("execution_dependency"),
    canonicalId: uuid("canonical_id"),
    clientRef: text("client_ref"),
    baseRevisionId: uuid("base_revision_id"),
    baseVersion: integer("base_version"),
    baseFingerprint: text("base_fingerprint"),
  },
  (table) => [
    unique("copilot_targets_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_targets_revision_ordinal_idx").on(table.revisionId, table.ordinal),
    uniqueIndex("copilot_targets_revision_client_ref_idx")
      .on(table.revisionId, table.clientRef)
      .where(sql`${table.clientRef} is not null`),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_targets_revision_workspace_fk",
    }),
    index("copilot_targets_canonical_idx").on(table.resourceType, table.canonicalId),
    check("copilot_targets_ordinal_check", sql`${table.ordinal} >= 0`),
    check(
      "copilot_targets_resource_type_check",
      sql`${table.resourceType} in ('series', 'bible', 'character', 'location', 'prop', 'episode_plan', 'scene', 'shot', 'paid_job')`,
    ),
    check(
      "copilot_targets_operation_check",
      sql`${table.operation} in ('create', 'update', 'archive', 'request')`,
    ),
    check(
      "copilot_targets_identity_check",
      sql`(${table.operation} = 'create' and ${table.canonicalId} is null and ${table.clientRef} is not null) or (${table.operation} <> 'create' and ${table.canonicalId} is not null)`,
    ),
    check(
      "copilot_targets_execution_dependency_check",
      sql`${table.executionDependency} is null or ${table.executionDependency} in ('independent', 'requires_application_receipt')`,
    ),
    check(
      "copilot_targets_base_fingerprint_check",
      sql`${table.baseFingerprint} is null or ${table.baseFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const copilotValidationRuns = pgTable(
  "copilot_validation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revisionId: uuid("revision_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    revisionFingerprint: text("revision_fingerprint").notNull(),
    baseFingerprint: text("base_fingerprint").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_validations_id_workspace_unique").on(table.id, table.workspaceId),
    unique("copilot_validations_id_revision_workspace_unique").on(
      table.id,
      table.revisionId,
      table.workspaceId,
    ),
    uniqueIndex("copilot_validations_exact_idx").on(
      table.revisionId,
      table.revisionFingerprint,
      table.baseFingerprint,
    ),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_validations_revision_workspace_fk",
    }),
    index("copilot_validations_revision_created_idx").on(table.revisionId, table.createdAt),
    check(
      "copilot_validations_status_check",
      sql`${table.status} in ('valid', 'valid_with_warnings', 'invalid', 'stale')`,
    ),
    check(
      "copilot_validations_revision_fingerprint_check",
      sql`${table.revisionFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_validations_base_fingerprint_check",
      sql`${table.baseFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const copilotValidationFindings = pgTable(
  "copilot_validation_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    validationRunId: uuid("validation_run_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    ordinal: integer("ordinal").notNull(),
    severity: text("severity").notNull(),
    code: text("code").notNull(),
    targetRef: text("target_ref"),
    fieldPath: text("field_path"),
    message: text("message").notNull(),
    remediation: text("remediation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_findings_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_findings_run_ordinal_idx").on(table.validationRunId, table.ordinal),
    foreignKey({
      columns: [table.validationRunId, table.workspaceId],
      foreignColumns: [copilotValidationRuns.id, copilotValidationRuns.workspaceId],
      name: "copilot_findings_validation_workspace_fk",
    }),
    index("copilot_findings_run_severity_idx").on(table.validationRunId, table.severity),
    check("copilot_findings_ordinal_check", sql`${table.ordinal} >= 0`),
    check("copilot_findings_severity_check", sql`${table.severity} in ('warning', 'blocking')`),
  ],
);

export const copilotDecisions = pgTable(
  "copilot_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revisionId: uuid("revision_id").notNull(),
    validationRunId: uuid("validation_run_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    fingerprint: text("fingerprint").notNull(),
    diffFingerprint: text("diff_fingerprint").notNull(),
    baseFingerprint: text("base_fingerprint").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_decisions_id_workspace_unique").on(table.id, table.workspaceId),
    unique("copilot_decisions_id_revision_workspace_unique").on(
      table.id,
      table.revisionId,
      table.workspaceId,
    ),
    uniqueIndex("copilot_decisions_revision_idx").on(table.revisionId),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_decisions_revision_workspace_fk",
    }),
    foreignKey({
      columns: [table.validationRunId, table.revisionId, table.workspaceId],
      foreignColumns: [
        copilotValidationRuns.id,
        copilotValidationRuns.revisionId,
        copilotValidationRuns.workspaceId,
      ],
      name: "copilot_decisions_validation_workspace_fk",
    }),
    index("copilot_decisions_workspace_actor_idx").on(table.workspaceId, table.actorUserId),
    check(
      "copilot_decisions_kind_check",
      sql`${table.kind} in ('approved', 'rejected', 'discarded')`,
    ),
    check("copilot_decisions_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
    check(
      "copilot_decisions_diff_fingerprint_check",
      sql`${table.diffFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_decisions_base_fingerprint_check",
      sql`${table.baseFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const copilotApplications = pgTable(
  "copilot_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    approvalId: uuid("approval_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("applying"),
    errorCode: text("error_code"),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_applications_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_applications_approval_idx").on(table.approvalId),
    uniqueIndex("copilot_applications_workspace_key_idx").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [table.approvalId, table.workspaceId],
      foreignColumns: [copilotDecisions.id, copilotDecisions.workspaceId],
      name: "copilot_applications_approval_workspace_fk",
    }),
    index("copilot_applications_workspace_status_idx").on(table.workspaceId, table.status),
    check(
      "copilot_applications_status_check",
      sql`${table.status} in ('applying', 'applied', 'failed_before_commit')`,
    ),
  ],
);

export const copilotApplicationReceipts = pgTable(
  "copilot_application_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull(),
    approvalId: uuid("approval_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    fingerprint: text("fingerprint").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    canonicalResults: jsonb("canonical_results").$type<unknown[]>().notNull().default([]),
    correlationId: text("correlation_id").notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_receipts_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_receipts_application_idx").on(table.applicationId),
    uniqueIndex("copilot_receipts_approval_idx").on(table.approvalId),
    uniqueIndex("copilot_receipts_revision_idx").on(table.revisionId),
    foreignKey({
      columns: [table.applicationId, table.workspaceId],
      foreignColumns: [copilotApplications.id, copilotApplications.workspaceId],
      name: "copilot_receipts_application_workspace_fk",
    }),
    foreignKey({
      columns: [table.approvalId, table.revisionId, table.workspaceId],
      foreignColumns: [
        copilotDecisions.id,
        copilotDecisions.revisionId,
        copilotDecisions.workspaceId,
      ],
      name: "copilot_receipts_approval_workspace_fk",
    }),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_receipts_revision_workspace_fk",
    }),
    index("copilot_receipts_workspace_committed_idx").on(table.workspaceId, table.committedAt),
    check("copilot_receipts_fingerprint_check", sql`${table.fingerprint} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const copilotCostQuotes = pgTable(
  "copilot_cost_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    targetKind: text("target_kind").notNull(),
    messageId: uuid("message_id"),
    revisionId: uuid("revision_id"),
    approvalId: uuid("approval_id"),
    revisionFingerprint: text("revision_fingerprint"),
    executionDependency: text("execution_dependency").notNull(),
    scope: jsonb("scope").$type<Record<string, unknown>>().notNull(),
    scopeFingerprint: text("scope_fingerprint").notNull(),
    quoteFingerprint: text("quote_fingerprint").notNull(),
    provider: text("provider").notNull(),
    model: text("model"),
    kind: text("kind").notNull(),
    currency: text("currency").notNull(),
    maximumEstimatedCost: numeric("maximum_estimated_cost", { precision: 14, scale: 6 }).notNull(),
    estimatedCredits: integer("estimated_credits").notNull(),
    quotaLimit: integer("quota_limit").notNull(),
    quotaUsed: integer("quota_used").notNull(),
    quotaFingerprint: text("quota_fingerprint").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_quotes_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_quotes_fingerprint_idx").on(table.workspaceId, table.quoteFingerprint),
    foreignKey({
      columns: [table.messageId, table.workspaceId],
      foreignColumns: [copilotMessages.id, copilotMessages.workspaceId],
      name: "copilot_quotes_message_workspace_fk",
    }),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_quotes_revision_workspace_fk",
    }),
    foreignKey({
      columns: [table.approvalId, table.revisionId, table.workspaceId],
      foreignColumns: [
        copilotDecisions.id,
        copilotDecisions.revisionId,
        copilotDecisions.workspaceId,
      ],
      name: "copilot_quotes_approval_workspace_fk",
    }),
    index("copilot_quotes_workspace_expires_idx").on(table.workspaceId, table.expiresAt),
    check("copilot_quotes_target_check", sql`${table.targetKind} in ('inference', 'paid_job')`),
    check(
      "copilot_quotes_binding_check",
      sql`(${table.targetKind} = 'inference' and ${table.messageId} is not null and ${table.revisionId} is null and ${table.approvalId} is null) or (${table.targetKind} = 'paid_job' and ${table.messageId} is null and ${table.revisionId} is not null and ${table.approvalId} is not null)`,
    ),
    check(
      "copilot_quotes_execution_dependency_check",
      sql`${table.executionDependency} in ('independent', 'requires_application_receipt')`,
    ),
    check(
      "copilot_quotes_scope_fingerprint_check",
      sql`${table.scopeFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_quotes_quote_fingerprint_check",
      sql`${table.quoteFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_quotes_revision_fingerprint_check",
      sql`${table.revisionFingerprint} is null or ${table.revisionFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_quotes_quota_fingerprint_check",
      sql`${table.quotaFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check("copilot_quotes_amount_check", sql`${table.maximumEstimatedCost} >= 0`),
    check("copilot_quotes_credits_check", sql`${table.estimatedCredits} >= 0`),
    check("copilot_quotes_quota_check", sql`${table.quotaLimit} >= 0 and ${table.quotaUsed} >= 0`),
  ],
);

export const copilotCostConfirmations = pgTable(
  "copilot_cost_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    quoteFingerprint: text("quote_fingerprint").notNull(),
    revisionFingerprint: text("revision_fingerprint"),
    scopeFingerprint: text("scope_fingerprint").notNull(),
    quotaFingerprint: text("quota_fingerprint").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_confirmations_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_confirmations_quote_idx").on(table.quoteId),
    foreignKey({
      columns: [table.quoteId, table.workspaceId],
      foreignColumns: [copilotCostQuotes.id, copilotCostQuotes.workspaceId],
      name: "copilot_confirmations_quote_workspace_fk",
    }),
    index("copilot_confirmations_workspace_actor_idx").on(table.workspaceId, table.actorUserId),
    check(
      "copilot_confirmations_quote_fingerprint_check",
      sql`${table.quoteFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_confirmations_scope_fingerprint_check",
      sql`${table.scopeFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_confirmations_quota_fingerprint_check",
      sql`${table.quotaFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "copilot_confirmations_revision_fingerprint_check",
      sql`${table.revisionFingerprint} is null or ${table.revisionFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const copilotInferenceUsage = pgTable(
  "copilot_inference_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    conversationId: uuid("conversation_id").notNull(),
    messageId: uuid("message_id").notNull(),
    revisionId: uuid("revision_id"),
    confirmationId: uuid("confirmation_id").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptSnapshotId: uuid("prompt_snapshot_id").references(() => promptSnapshots.id),
    promptPurpose: text("prompt_purpose").notNull(),
    promptVersion: integer("prompt_version"),
    inputUnits: integer("input_units").notNull().default(0),
    outputUnits: integer("output_units").notNull().default(0),
    durationMs: integer("duration_ms"),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 6 }),
    actualCost: numeric("actual_cost", { precision: 14, scale: 6 }),
    currency: text("currency").notNull(),
    status: text("status").notNull(),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_usage_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_usage_confirmation_idx").on(table.confirmationId),
    foreignKey({
      columns: [table.conversationId, table.workspaceId],
      foreignColumns: [copilotConversations.id, copilotConversations.workspaceId],
      name: "copilot_usage_conversation_workspace_fk",
    }),
    foreignKey({
      columns: [table.messageId, table.workspaceId],
      foreignColumns: [copilotMessages.id, copilotMessages.workspaceId],
      name: "copilot_usage_message_workspace_fk",
    }),
    foreignKey({
      columns: [table.revisionId, table.workspaceId],
      foreignColumns: [copilotProposalRevisions.id, copilotProposalRevisions.workspaceId],
      name: "copilot_usage_revision_workspace_fk",
    }),
    foreignKey({
      columns: [table.confirmationId, table.workspaceId],
      foreignColumns: [copilotCostConfirmations.id, copilotCostConfirmations.workspaceId],
      name: "copilot_usage_confirmation_workspace_fk",
    }),
    index("copilot_usage_workspace_created_idx").on(table.workspaceId, table.createdAt),
    check("copilot_usage_units_check", sql`${table.inputUnits} >= 0 and ${table.outputUnits} >= 0`),
    check(
      "copilot_usage_duration_check",
      sql`${table.durationMs} is null or ${table.durationMs} >= 0`,
    ),
    check(
      "copilot_usage_cost_check",
      sql`(${table.estimatedCost} is null or ${table.estimatedCost} >= 0) and (${table.actualCost} is null or ${table.actualCost} >= 0)`,
    ),
    check("copilot_usage_status_check", sql`${table.status} in ('succeeded', 'failed')`),
  ],
);

export const copilotRateLimitBuckets = pgTable(
  "copilot_rate_limit_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    operation: text("operation").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    limit: integer("limit").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("copilot_rate_buckets_scope_idx").on(
      table.workspaceId,
      table.actorUserId,
      table.operation,
      table.windowStartedAt,
    ),
    index("copilot_rate_buckets_expires_idx").on(table.expiresAt),
    check("copilot_rate_buckets_count_check", sql`${table.count} >= 0`),
    check(
      "copilot_rate_buckets_limit_check",
      sql`${table.limit} > 0 and ${table.count} <= ${table.limit}`,
    ),
  ],
);

export const copilotJobBindings = pgTable(
  "copilot_job_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id),
    confirmationId: uuid("confirmation_id").notNull(),
    jobId: uuid("job_id").notNull(),
    intentFingerprint: text("intent_fingerprint").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("copilot_job_bindings_id_workspace_unique").on(table.id, table.workspaceId),
    uniqueIndex("copilot_job_bindings_confirmation_idx").on(table.confirmationId),
    index("copilot_job_bindings_job_idx").on(table.jobId),
    uniqueIndex("copilot_job_bindings_workspace_key_idx").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    foreignKey({
      columns: [table.confirmationId, table.workspaceId],
      foreignColumns: [copilotCostConfirmations.id, copilotCostConfirmations.workspaceId],
      name: "copilot_job_bindings_confirmation_workspace_fk",
    }),
    foreignKey({
      columns: [table.jobId, table.workspaceId],
      foreignColumns: [jobs.id, jobs.workspaceId],
      name: "copilot_job_bindings_job_workspace_fk",
    }),
    index("copilot_job_bindings_intent_idx").on(table.workspaceId, table.intentFingerprint),
    check(
      "copilot_job_bindings_intent_fingerprint_check",
      sql`${table.intentFingerprint} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);
