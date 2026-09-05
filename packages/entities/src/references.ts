import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  assets,
  entities,
  entityVersions,
  jobs,
  referenceAssets,
  referenceSheets,
  series,
  workspace,
  type Db,
} from "@ai-series/db";
import { enqueueJob } from "@ai-series/jobs";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";

async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) {
    throw new Error("Default workspace not found");
  }
  return row.id;
}

export async function generateReferenceSheet(
  db: Db,
  input: { entityId: string; panels?: string },
): Promise<{ sheetId: string; jobId: string }> {
  const [entity] = await db.select().from(entities).where(eq(entities.id, input.entityId));
  if (!entity) {
    throw new Error("Entity not found");
  }
  const [version] = await db
    .select()
    .from(entityVersions)
    .where(and(eq(entityVersions.entityId, entity.id), eq(entityVersions.isActive, true)));
  if (!version) {
    throw new Error("No active entity version");
  }
  const [s] = await db.select().from(series).where(eq(series.id, entity.seriesId));

  const active = await getActivePrompt(db, "reference.sheet");
  if (!active) {
    throw new Error("No active reference.sheet prompt");
  }
  const variables = {
    entity_type: entity.type,
    entity_name: entity.name,
    entity_data: JSON.stringify(version.data ?? {}),
    series_name: s?.name ?? "",
    visual_style: "",
    panels: input.panels ?? "front, side, three-quarter",
  };
  const { missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) {
    throw new Error(`Missing prompt variables: ${missing.join(", ")}`);
  }

  const workspaceId = await resolveWorkspaceId(db);
  const { id: jobId } = await enqueueJob(db, {
    workspaceId,
    idempotencyKey: randomUUID(),
    kind: "image",
    input: { templateId: active.templateId, variables, params: {} },
  });

  const [sheet] = await db
    .insert(referenceSheets)
    .values({
      entityId: entity.id,
      entityVersionId: version.id,
      jobId,
      status: "draft",
      panels: input.panels ?? null,
    })
    .returning({ id: referenceSheets.id });

  return { sheetId: sheet.id, jobId };
}

async function resolveAssetForJob(db: Db, jobId: string | null) {
  if (!jobId) return null;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job?.generationId) return null;
  const [asset] = await db.select().from(assets).where(eq(assets.generationId, job.generationId));
  return asset ?? null;
}

export async function listReferenceSheets(db: Db, entityId: string) {
  const sheets = await db
    .select()
    .from(referenceSheets)
    .where(eq(referenceSheets.entityId, entityId))
    .orderBy(desc(referenceSheets.createdAt));
  const enriched = [];
  for (const sheet of sheets) {
    enriched.push({ ...sheet, asset: await resolveAssetForJob(db, sheet.jobId) });
  }
  return enriched;
}

export async function updateReferenceSheetStatus(
  db: Db,
  sheetId: string,
  status: "draft" | "approved" | "rejected",
): Promise<void> {
  await db.update(referenceSheets).set({ status }).where(eq(referenceSheets.id, sheetId));
}

export async function promoteReferenceSheet(db: Db, sheetId: string): Promise<string> {
  const [sheet] = await db.select().from(referenceSheets).where(eq(referenceSheets.id, sheetId));
  if (!sheet) {
    throw new Error("Sheet not found");
  }
  const [entity] = await db.select().from(entities).where(eq(entities.id, sheet.entityId));
  if (!entity) {
    throw new Error("Entity not found");
  }
  const asset = await resolveAssetForJob(db, sheet.jobId);
  if (!asset) {
    throw new Error("No generated asset to promote");
  }
  await db.update(referenceSheets).set({ status: "approved" }).where(eq(referenceSheets.id, sheetId));
  const [ref] = await db
    .insert(referenceAssets)
    .values({ entityType: entity.type, entityId: entity.id, assetId: asset.id, status: "approved" })
    .returning({ id: referenceAssets.id });
  return ref.id;
}
