import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { schema } from "@ai-series/db";
import type { ProposalPayload } from "@ai-series/copilot";
import {
  appendProposalRevision,
  createConversation,
  decideRevision,
  validateRevision,
} from "../../app/api/copilot/_lib/store";

const migrationsFolder = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "packages",
  "db",
  "migrations",
);

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function createRuntimeHarness(database: string) {
  const admin = postgres(databaseUrl("postgres"), { max: 1 });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${database}`);
  await admin.end();

  const sql = postgres(databaseUrl(database), { max: 12 });
  const db = drizzle(sql, { schema });
  await migrate(db, { migrationsFolder });

  async function close() {
    await sql.end();
    const cleanup = postgres(databaseUrl("postgres"), { max: 1 });
    await cleanup.unsafe(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    await cleanup.end();
  }

  async function actor(workspaceSlug: string, role: "owner" | "editor" | "viewer" = "editor") {
    const [workspace] = await db
      .insert(schema.workspace)
      .values({ name: workspaceSlug, slug: workspaceSlug })
      .returning();
    const [user] = await db
      .insert(schema.users)
      .values({ email: `${workspaceSlug}-${randomUUID()}@example.test`, passwordHash: "test-only" })
      .returning();
    await db.insert(schema.workspaceMembers).values({
      workspaceId: workspace!.id,
      userId: user!.id,
      role,
    });
    await db.insert(schema.workspaceQuotas).values({
      workspaceId: workspace!.id,
      monthlyLimit: 100,
      creditsUsed: 0,
      resetAt: new Date("2035-01-01T00:00:00.000Z"),
    });
    return { workspace: workspace!, user: user! };
  }

  async function proposal(input: {
    workspaceId: string;
    actorUserId: string;
    payload: ProposalPayload;
    seriesId?: string;
    episodePlanId?: string;
  }) {
    const created = await createConversation(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      role: "editor",
      title: "Runtime integration",
      selection: {
        ...(input.seriesId ? { seriesId: input.seriesId } : {}),
        ...(input.episodePlanId ? { episodePlanId: input.episodePlanId } : {}),
      },
    });
    const [context] = await db
      .select()
      .from(schema.copilotContextSnapshots)
      .where(eq(schema.copilotContextSnapshots.conversationId, created.conversation.id))
      .limit(1);
    const [row] = await db
      .insert(schema.copilotProposals)
      .values({
        conversationId: created.conversation.id,
        workspaceId: input.workspaceId,
        contextSnapshotId: context!.id,
        createdByUserId: input.actorUserId,
        intent: "canonical_mutation",
        status: "ready_for_review",
      })
      .returning();
    const revision = await appendProposalRevision(db, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      proposalId: row!.id,
      clientRevisionId: randomUUID(),
      payload: input.payload,
    });
    return { conversation: created.conversation, proposal: row!, revision };
  }

  async function approve(input: {
    workspaceId: string;
    actorUserId: string;
    proposalId: string;
    revisionId: string;
    fingerprint: string;
  }) {
    const checked = await validateRevision(db, {
      workspaceId: input.workspaceId,
      proposalId: input.proposalId,
      revisionId: input.revisionId,
      fingerprint: input.fingerprint,
    });
    const decision = await decideRevision(db, {
      ...input,
      validationRunId: checked.validation.id,
      decision: "approve",
    });
    return { validation: checked, decision };
  }

  async function count(table: typeof schema.series, workspaceId: string) {
    return (await db.select().from(table).where(eq(table.workspaceId, workspaceId))).length;
  }

  async function membership(workspaceId: string, userId: string, role: string) {
    await db
      .update(schema.workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      );
  }

  return { db, sql, close, actor, proposal, approve, count, membership };
}

export type RuntimeHarness = Awaited<ReturnType<typeof createRuntimeHarness>>;

export const bible = {
  title: "Night City",
  premise: "A city changes every night.",
  genre: "Thriller",
  tone: "Tense",
  audience: "Adults",
  format: "Vertical",
  language: "es",
  episodeDuration: "60s",
  narrativeRules: ["Changes happen at midnight"],
  visualStyle: "Neon noir",
  canon: ["The city changes nightly"],
  prohibitions: ["No time travel"],
  description: "A mutable city and its witnesses.",
};

export const character = {
  role: "lead",
  apparentAge: "30",
  appearance: "Dark coat",
  distinctiveTraits: ["scar"],
  wardrobe: "black coat",
  personality: "observant",
  voice: "calm",
  state: "active",
  visualRules: ["keep the scar"],
};

export const location = {
  description: "A neon station",
  zones: ["platform"],
  lighting: "neon",
  era: "near future",
  restrictions: ["no daylight"],
  visualRules: ["wet floor"],
};

export const prop = {
  description: "An old brass key",
  material: "brass",
  scale: "small",
  state: "weathered",
  owner: "Rin",
  narrativeRelevance: "opens the station vault",
};

export function plan(characterId: string, locationId: string, propId: string) {
  return {
    hook: "The station moves.",
    dramaticGoal: "Find the exit.",
    beats: ["arrival", "reveal"],
    targetDuration: "60s",
    characterIds: [characterId],
    locationIds: [locationId],
    propIds: [propId],
    reveals: ["the key remembers"],
    requiredContinuity: ["Rin has the key"],
    closing: "The doors lock.",
    cliffhanger: "A second station appears.",
    audienceQuestion: "Which door?",
    proposedStoryStateAfter: {
      currentEpisode: 2,
      characters: [],
      inventory: ["key"],
      facts: ["the station moves"],
      goals: ["escape"],
      secretsKnown: [],
      secretsUnknown: ["who controls it"],
      openQuestions: ["which door"],
      pastDecisions: [],
      pendingConsequences: [],
      canon: ["the city changes nightly"],
    },
  };
}

export function scene(characterId: string, locationId: string, propId: string) {
  return {
    purpose: "Reveal the moving station",
    locationId,
    characterIds: [characterId],
    propIds: [propId],
    action: "Rin turns the key as the platform moves.",
    dialogue: "This was not here yesterday.",
    estimatedDuration: "12s",
    entryContinuity: "Rin holds the key.",
    exitContinuity: "The vault is open.",
    shots: [
      {
        type: "close-up",
        subject: "Rin",
        action: "turns the key",
        composition: "centered",
        camera: "static",
        lens: "50mm",
        lighting: "neon",
        emotion: "tense",
        requiredReferences: [characterId, propId],
        imagePrompt: "Rin turns a brass key",
        videoPrompt: "Rin slowly turns the key",
        continuityConstraints: ["black coat", "brass key"],
      },
    ],
  };
}
