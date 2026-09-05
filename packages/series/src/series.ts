import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { promptSnapshots, series, seriesBibles, workspace, type Db } from "@ai-series/db";
import { generateStructured } from "@ai-series/ai";
import { getActivePrompt, renderTemplate } from "@ai-series/prompts";

export const BibleSchema = z.object({
  title: z.string(),
  premise: z.string(),
  genre: z.string(),
  tone: z.string(),
  audience: z.string(),
  format: z.string(),
  language: z.string(),
  episodeDuration: z.string(),
  narrativeRules: z.array(z.string()),
  visualStyle: z.string(),
  canon: z.array(z.string()),
  prohibitions: z.array(z.string()),
  description: z.string(),
});
export type BibleInput = z.infer<typeof BibleSchema>;

export type CreateSeriesInput = { name: string; slug?: string };

export type BibleRevisionInput = BibleInput & {
  source?: string;
  promptSnapshotId?: string | null;
};

export type CanonicalRevision = { id: string; version: number };

export function buildBiblePrompt(basePrompt: string, details?: string): string {
  const normalizedDetails = details?.trim();
  if (!normalizedDetails) return basePrompt;

  return `${basePrompt}\n\nCreator-provided series details:\n<series_details>\n${normalizedDetails}\n</series_details>\nIncorporate these details into the series bible while preserving the required output contract.`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

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

export async function createSeriesInWorkspace(
  db: Db,
  input: CreateSeriesInput & { workspaceId: string },
): Promise<string> {
  const name = z.string().trim().min(1).parse(input.name);
  const slug = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .parse(input.slug ?? slugify(name));
  const [created] = await db
    .insert(series)
    .values({ workspaceId: input.workspaceId, name, slug })
    .returning({ id: series.id });
  if (!created) throw new Error("Series could not be created");
  return created.id;
}

export async function createSeries(db: Db, input: CreateSeriesInput) {
  const workspaceId = await resolveWorkspaceId(db);
  return createSeriesInWorkspace(db, { ...input, workspaceId });
}

export async function renameSeriesInWorkspace(
  db: Db,
  input: { workspaceId: string; seriesId: string; name: string },
): Promise<void> {
  const name = z.string().trim().min(1).parse(input.name);
  const [updated] = await db
    .update(series)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(series.id, input.seriesId), eq(series.workspaceId, input.workspaceId)))
    .returning({ id: series.id });
  if (!updated) throw new Error("Series not found");
}

export async function archiveSeriesInWorkspace(
  db: Db,
  input: { workspaceId: string; seriesId: string },
): Promise<void> {
  const [updated] = await db
    .update(series)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(series.id, input.seriesId), eq(series.workspaceId, input.workspaceId)))
    .returning({ id: series.id });
  if (!updated) throw new Error("Series not found");
}

export async function renameSeries(db: Db, id: string, name: string): Promise<void> {
  await db.update(series).set({ name, updatedAt: new Date() }).where(eq(series.id, id));
}

export async function archiveSeries(db: Db, id: string): Promise<void> {
  await db
    .update(series)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(series.id, id));
}

export async function duplicateSeries(db: Db, id: string): Promise<string> {
  const [source] = await db.select().from(series).where(eq(series.id, id));
  if (!source) {
    throw new Error("Series not found");
  }
  const [created] = await db
    .insert(series)
    .values({
      workspaceId: source.workspaceId,
      name: `${source.name} (copy)`,
      slug: `${source.slug}-copy`,
    })
    .returning({ id: series.id });
  return created.id;
}

export async function listSeries(db: Db) {
  return db.select().from(series).orderBy(desc(series.createdAt)).limit(200);
}

export async function getSeriesDetail(db: Db, id: string) {
  const [found] = await db.select().from(series).where(eq(series.id, id));
  if (!found) {
    return null;
  }
  const bibles = await db
    .select()
    .from(seriesBibles)
    .where(eq(seriesBibles.seriesId, id))
    .orderBy(desc(seriesBibles.version));
  return { series: found, bibles };
}

export async function createBibleRevision(
  db: Db,
  seriesId: string,
  input: BibleRevisionInput,
): Promise<string> {
  const [owner] = await db
    .select({ workspaceId: series.workspaceId })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);
  if (!owner) throw new Error("Series not found");
  const created = await db.transaction((tx) =>
    appendBibleRevisionInWorkspace(tx, {
      workspaceId: owner.workspaceId,
      seriesId,
      bible: input,
    }),
  );
  return created.id;
}

export async function appendBibleRevisionInWorkspace(
  db: Db,
  input: { workspaceId: string; seriesId: string; bible: BibleRevisionInput },
): Promise<CanonicalRevision> {
  const bible = BibleSchema.parse(input.bible);
  const [owner] = await db
    .select({ id: series.id })
    .from(series)
    .where(and(eq(series.id, input.seriesId), eq(series.workspaceId, input.workspaceId)))
    .limit(1)
    .for("update");
  if (!owner) throw new Error("Series not found");

  const existing = await db
    .select({ version: seriesBibles.version })
    .from(seriesBibles)
    .where(eq(seriesBibles.seriesId, input.seriesId));
  const next = Math.max(0, ...existing.map((value) => value.version)) + 1;
  await db
    .update(seriesBibles)
    .set({ isActive: false })
    .where(and(eq(seriesBibles.seriesId, input.seriesId), eq(seriesBibles.isActive, true)));
  const [created] = await db
    .insert(seriesBibles)
    .values({
      seriesId: input.seriesId,
      version: next,
      title: bible.title,
      premise: bible.premise,
      genre: bible.genre,
      tone: bible.tone,
      audience: bible.audience,
      format: bible.format,
      language: bible.language,
      episodeDuration: bible.episodeDuration,
      narrativeRules: bible.narrativeRules,
      visualStyle: bible.visualStyle,
      canon: bible.canon,
      prohibitions: bible.prohibitions,
      description: bible.description,
      source: input.bible.source ?? "manual",
      promptSnapshotId: input.bible.promptSnapshotId ?? null,
      isActive: true,
    })
    .returning({ id: seriesBibles.id });
  if (!created) throw new Error("Bible revision could not be created");
  return { id: created.id, version: next };
}

export async function activateBibleRevision(db: Db, bibleId: string): Promise<void> {
  const [bible] = await db.select().from(seriesBibles).where(eq(seriesBibles.id, bibleId));
  if (!bible) {
    throw new Error("Bible revision not found");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(seriesBibles)
      .set({ isActive: false })
      .where(eq(seriesBibles.seriesId, bible.seriesId));
    await tx.update(seriesBibles).set({ isActive: true }).where(eq(seriesBibles.id, bibleId));
  });
}

export async function generateBibleProposal(
  db: Db,
  seriesId: string,
  input: { details?: string } = {},
): Promise<string> {
  const [found] = await db.select().from(series).where(eq(series.id, seriesId));
  if (!found) {
    throw new Error("Series not found");
  }
  const active = await getActivePrompt(db, "series.bible");
  if (!active) {
    throw new Error("No active series.bible prompt");
  }
  const details = input.details?.trim();
  const hasDetailsPlaceholder = active.template.includes("{{series_details}}");
  const variables = {
    series_name: found.name,
    ...(details
      ? { series_details: details }
      : hasDetailsPlaceholder
        ? { series_details: "No additional series details provided." }
        : {}),
  };
  const { rendered, missing } = renderTemplate(active.template, variables, active.variables);
  if (missing.length > 0) {
    throw new Error(`Missing prompt variables: ${missing.join(", ")}`);
  }

  const finalPrompt = hasDetailsPlaceholder ? rendered : buildBiblePrompt(rendered, details);
  const object = await generateStructured({ prompt: finalPrompt, schema: BibleSchema });

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

  return createBibleRevision(db, seriesId, {
    ...object,
    source: "generated",
    promptSnapshotId: snapshot.id,
  });
}
