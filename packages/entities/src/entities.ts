import { and, asc, desc, eq } from "drizzle-orm";
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

export type ActiveEntity = {
  id: string;
  type: EntityType;
  name: string;
  data: Record<string, unknown>;
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

export function buildEntityPrompt(basePrompt: string, details?: string): string {
  const normalizedDetails = details?.trim();
  if (!normalizedDetails) return basePrompt;

  return `${basePrompt}\n\nCreator-provided entity details:\n<entity_details>\n${normalizedDetails}\n</entity_details>\nIncorporate these details into the entity reference while preserving the required output contract.`;
}

export async function createEntity(
  db: Db,
  input: { seriesId: string; type: EntityType; name: string; data: Record<string, unknown> },
): Promise<string> {
  const [created] = await db
    .insert(entities)
    .values({ seriesId: input.seriesId, type: input.type, name: input.name })
    .returning({ id: entities.id });
  await db.insert(entityVersions).values({
    entityId: created.id,
    version: 1,
    name: input.name,
    data: input.data,
    isActive: true,
  });
  return created.id;
}

export async function editEntity(
  db: Db,
  entityId: string,
  input: { name?: string; data?: Record<string, unknown> },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [entity] = await tx.select().from(entities).where(eq(entities.id, entityId));
    if (!entity) throw new Error("Entity not found");
    const versions = await tx
      .select({ version: entityVersions.version })
      .from(entityVersions)
      .where(eq(entityVersions.entityId, entityId));
    const next = Math.max(0, ...versions.map((v) => v.version)) + 1;
    await tx
      .update(entityVersions)
      .set({ isActive: false })
      .where(and(eq(entityVersions.entityId, entityId), eq(entityVersions.isActive, true)));
    const [active] = await tx
      .select()
      .from(entityVersions)
      .where(eq(entityVersions.entityId, entityId))
      .orderBy(desc(entityVersions.version))
      .limit(1);
    const [created] = await tx
      .insert(entityVersions)
      .values({
        entityId,
        version: next,
        name: input.name ?? entity.name,
        data: input.data ?? active?.data ?? {},
        isActive: true,
      })
      .returning({ id: entityVersions.id });
    return created.id;
  });
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

export async function listActiveEntities(db: Db, seriesId: string): Promise<ActiveEntity[]> {
  const rows = await db
    .select({
      id: entities.id,
      type: entities.type,
      name: entities.name,
      data: entityVersions.data,
    })
    .from(entities)
    .innerJoin(
      entityVersions,
      and(eq(entityVersions.entityId, entities.id), eq(entityVersions.isActive, true)),
    )
    .where(eq(entities.seriesId, seriesId))
    .orderBy(asc(entities.createdAt));

  return rows.map((row) => ({
    id: row.id,
    type: row.type as EntityType,
    name: row.name,
    data: row.data,
  }));
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

export async function generateEntityProposal(
  db: Db,
  entityId: string,
  input: { details?: string } = {},
): Promise<string> {
  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId));
  if (!entity) throw new Error("Entity not found");
  const [s] = await db.select().from(series).where(eq(series.id, entity.seriesId));

  const purpose = PROMPT_PURPOSE[entity.type as EntityType];
  const active = await getActivePrompt(db, purpose);
  if (!active) throw new Error(`No active ${purpose} prompt`);
  const details = input.details?.trim();
  const hasDetailsPlaceholder = active.template.includes("{{entity_details}}");
  const variables = {
    series_name: s?.name ?? "",
    entity_name: entity.name,
    ...(details
      ? { entity_details: details }
      : hasDetailsPlaceholder
        ? { entity_details: "No additional entity details provided." }
        : {}),
  };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) throw new Error(`Missing prompt variables: ${missing.join(", ")}`);

  const finalPrompt = hasDetailsPlaceholder ? rendered : buildEntityPrompt(rendered, details);

  const object = (await generateStructured({
    prompt: finalPrompt,
    schema: dataSchema(entity.type as EntityType),
  })) as Record<string, unknown>;

  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: active.templateId,
      versionId: active.versionId,
      renderedText: finalPrompt,
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
