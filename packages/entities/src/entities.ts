import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  entities,
  entityVersions,
  promptSnapshots,
  referenceAssets,
  series,
  type Db,
} from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";

export type EntityType = "character" | "location" | "prop";
export const EntityTypeSchema = z.enum(["character", "location", "prop"]);

export type EntityRevisionResult = {
  entityId: string;
  versionId: string;
  version: number;
};

export const CharacterSchema = z.object({
  role: z.string(),
  apparentAge: z.string(),
  appearance: z.string(),
  distinctiveTraits: z.array(z.string()),
  wardrobe: z.string(),
  personality: z.string(),
  voice: z.string(),
  state: z.string(),
  visualRules: z.array(z.string()),
});

export const LocationSchema = z.object({
  description: z.string(),
  zones: z.array(z.string()),
  lighting: z.string(),
  era: z.string(),
  restrictions: z.array(z.string()),
  visualRules: z.array(z.string()),
});

export const PropSchema = z.object({
  description: z.string(),
  material: z.string(),
  scale: z.string(),
  state: z.string(),
  owner: z.string(),
  narrativeRelevance: z.string(),
});

export function dataSchema(type: EntityType): z.ZodTypeAny {
  if (type === "character") return CharacterSchema;
  if (type === "location") return LocationSchema;
  return PropSchema;
}

const PROMPT_PURPOSE: Record<EntityType, string> = {
  character: "character.reference",
  location: "location.reference",
  prop: "prop.reference",
};

export async function createEntity(
  db: Db,
  input: { seriesId: string; type: EntityType; name: string; data: Record<string, unknown> },
): Promise<string> {
  const [owner] = await db
    .select({ workspaceId: series.workspaceId })
    .from(series)
    .where(eq(series.id, input.seriesId))
    .limit(1);
  if (!owner) throw new Error("Series not found");
  const created = await db.transaction((tx) =>
    createEntityInWorkspace(tx, { ...input, workspaceId: owner.workspaceId }),
  );
  return created.entityId;
}

export async function createEntityInWorkspace(
  db: Db,
  input: {
    workspaceId: string;
    seriesId: string;
    type: EntityType;
    name: string;
    data: Record<string, unknown>;
    source?: string;
    promptSnapshotId?: string | null;
  },
): Promise<EntityRevisionResult> {
  const name = z.string().trim().min(1).parse(input.name);
  const data = dataSchema(input.type).parse(input.data) as Record<string, unknown>;
  const [owner] = await db
    .select({ id: series.id })
    .from(series)
    .where(and(eq(series.id, input.seriesId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!owner) throw new Error("Series not found");
  const [created] = await db
    .insert(entities)
    .values({ seriesId: input.seriesId, type: input.type, name })
    .returning({ id: entities.id });
  if (!created) throw new Error("Entity could not be created");
  const [version] = await db
    .insert(entityVersions)
    .values({
      entityId: created.id,
      version: 1,
      name,
      data,
      isActive: true,
      source: input.source ?? "manual",
      promptSnapshotId: input.promptSnapshotId ?? null,
    })
    .returning({ id: entityVersions.id });
  if (!version) throw new Error("Entity version could not be created");
  return { entityId: created.id, versionId: version.id, version: 1 };
}

export async function editEntity(
  db: Db,
  entityId: string,
  input: { name?: string; data?: Record<string, unknown> },
): Promise<string> {
  const [owner] = await db
    .select({ workspaceId: series.workspaceId })
    .from(entities)
    .innerJoin(series, eq(entities.seriesId, series.id))
    .where(eq(entities.id, entityId))
    .limit(1);
  if (!owner) throw new Error("Entity not found");
  const created = await db.transaction((tx) =>
    appendEntityRevisionInWorkspace(tx, {
      workspaceId: owner.workspaceId,
      entityId,
      ...input,
    }),
  );
  return created.versionId;
}

export async function appendEntityRevisionInWorkspace(
  db: Db,
  input: {
    workspaceId: string;
    entityId: string;
    name?: string;
    data?: Record<string, unknown>;
    source?: string;
    promptSnapshotId?: string | null;
  },
): Promise<EntityRevisionResult> {
  const [owned] = await db
    .select({
      id: entities.id,
      name: entities.name,
      type: entities.type,
      status: entities.status,
    })
    .from(entities)
    .innerJoin(series, eq(entities.seriesId, series.id))
    .where(and(eq(entities.id, input.entityId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!owned) throw new Error("Entity not found");
  if (owned.status === "archived") throw new Error("Entity is archived");

  const [active] = await db
    .select()
    .from(entityVersions)
    .where(and(eq(entityVersions.entityId, input.entityId), eq(entityVersions.isActive, true)))
    .limit(1);
  if (!active) throw new Error("Active entity version not found");
  const name = z
    .string()
    .trim()
    .min(1)
    .parse(input.name ?? active.name);
  const type = EntityTypeSchema.parse(owned.type);
  const data = dataSchema(type).parse(input.data ?? active.data) as Record<string, unknown>;
  const versions = await db
    .select({ version: entityVersions.version })
    .from(entityVersions)
    .where(eq(entityVersions.entityId, input.entityId));
  const next = Math.max(0, ...versions.map((value) => value.version)) + 1;
  await db
    .update(entityVersions)
    .set({ isActive: false })
    .where(and(eq(entityVersions.entityId, input.entityId), eq(entityVersions.isActive, true)));
  await db
    .update(entities)
    .set({ name, updatedAt: new Date() })
    .where(eq(entities.id, input.entityId));
  const [created] = await db
    .insert(entityVersions)
    .values({
      entityId: input.entityId,
      version: next,
      name,
      data,
      isActive: true,
      source: input.source ?? "manual",
      promptSnapshotId: input.promptSnapshotId ?? null,
    })
    .returning({ id: entityVersions.id });
  if (!created) throw new Error("Entity revision could not be created");
  return { entityId: input.entityId, versionId: created.id, version: next };
}

export async function archiveEntityInWorkspace(
  db: Db,
  input: { workspaceId: string; entityId: string },
): Promise<void> {
  const [owned] = await db
    .select({ id: entities.id })
    .from(entities)
    .innerJoin(series, eq(entities.seriesId, series.id))
    .where(and(eq(entities.id, input.entityId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!owned) throw new Error("Entity not found");
  await db
    .update(entities)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(entities.id, input.entityId));
}

export async function activateEntityVersion(db: Db, versionId: string): Promise<void> {
  const [version] = await db.select().from(entityVersions).where(eq(entityVersions.id, versionId));
  if (!version) throw new Error("Version not found");
  await db.transaction(async (tx) => {
    await tx
      .update(entityVersions)
      .set({ isActive: false })
      .where(eq(entityVersions.entityId, version.entityId));
    await tx.update(entityVersions).set({ isActive: true }).where(eq(entityVersions.id, versionId));
  });
}

export async function listEntities(db: Db, seriesId: string, type?: EntityType) {
  return db
    .select()
    .from(entities)
    .where(and(eq(entities.seriesId, seriesId), type ? eq(entities.type, type) : undefined))
    .orderBy(desc(entities.createdAt))
    .limit(500);
}

export async function getEntityDetail(db: Db, entityId: string) {
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId));
  if (!entity) return null;
  const versions = await db
    .select()
    .from(entityVersions)
    .where(eq(entityVersions.entityId, entityId))
    .orderBy(desc(entityVersions.version));
  const references = await db
    .select()
    .from(referenceAssets)
    .where(
      and(eq(referenceAssets.entityId, entityId), eq(referenceAssets.entityType, entity.type)),
    );
  return { entity, versions, references };
}

export async function attachReferenceAsset(
  db: Db,
  input: { entityType: EntityType; entityId: string; assetId: string; status?: string },
): Promise<string> {
  const [created] = await db
    .insert(referenceAssets)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      assetId: input.assetId,
      status: input.status ?? "approved",
    })
    .returning({ id: referenceAssets.id });
  return created.id;
}

export async function generateEntityProposal(db: Db, entityId: string): Promise<string> {
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId));
  if (!entity) throw new Error("Entity not found");
  const [s] = await db.select().from(series).where(eq(series.id, entity.seriesId));

  const type = EntityTypeSchema.parse(entity.type);
  const purpose = PROMPT_PURPOSE[type];
  const active = await getActivePrompt(db, purpose);
  if (!active) throw new Error(`No active ${purpose} prompt`);
  const variables = { series_name: s?.name ?? "", entity_name: entity.name };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) throw new Error(`Missing prompt variables: ${missing.join(", ")}`);

  const object = (await generateStructured({
    prompt: rendered,
    schema: dataSchema(type),
  })) as Record<string, unknown>;

  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: active.templateId,
      versionId: active.versionId,
      renderedText: rendered,
      variables,
      model: "gpt-4o-mini",
      params: {},
    })
    .returning({ id: promptSnapshots.id });

  return db.transaction(async (tx) => {
    const versions = await tx
      .select({ version: entityVersions.version })
      .from(entityVersions)
      .where(eq(entityVersions.entityId, entityId));
    const next = Math.max(0, ...versions.map((v) => v.version)) + 1;
    await tx
      .update(entityVersions)
      .set({ isActive: false })
      .where(eq(entityVersions.entityId, entityId));
    const [created] = await tx
      .insert(entityVersions)
      .values({
        entityId,
        version: next,
        name: entity.name,
        data: object,
        isActive: true,
        source: "generated",
        promptSnapshotId: snapshot.id,
      })
      .returning({ id: entityVersions.id });
    return created.id;
  });
}
