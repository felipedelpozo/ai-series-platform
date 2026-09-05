import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import {
  assets,
  generations,
  promptSnapshots,
  promptTemplates,
  promptVersions,
  workspace,
  type Db,
} from "@ai-series/db";
import { DEFAULT_IMAGE_MODEL, imageResult, imageStatus, submitImage } from "@ai-series/fal";
import { renderTemplate } from "@ai-series/prompts";
import { InvalidGenerationJobInputError } from "./job-input";

export type StartImageInput = {
  workspaceId: string;
  templateId?: string;
  versionId?: string;
  variables: Record<string, string>;
  params?: Record<string, unknown>;
  model?: string;
};

export async function resolveWorkspaceId(db: Db): Promise<string> {
  const [row] = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!row) {
    throw new Error("Default workspace not found");
  }
  return row.id;
}

export async function resolveActiveVersion(
  db: Db,
  opts: { workspaceId: string; templateId?: string; versionId?: string },
) {
  if (opts.versionId) {
    const [version] = await db
      .select({ version: promptVersions })
      .from(promptVersions)
      .innerJoin(promptTemplates, eq(promptTemplates.id, promptVersions.templateId))
      .where(
        and(
          eq(promptVersions.id, opts.versionId),
          eq(promptTemplates.workspaceId, opts.workspaceId),
        ),
      );
    return version?.version;
  }
  if (opts.templateId) {
    const versions = await db
      .select({ version: promptVersions })
      .from(promptVersions)
      .innerJoin(promptTemplates, eq(promptTemplates.id, promptVersions.templateId))
      .where(
        and(
          eq(promptVersions.templateId, opts.templateId),
          eq(promptVersions.isActive, true),
          eq(promptTemplates.workspaceId, opts.workspaceId),
        ),
      );
    return versions[0]?.version;
  }
  return undefined;
}

export function assetStoreDir(): string {
  return process.env.ASSET_STORE_DIR ?? ".media";
}

export async function ingestAsset(
  db: Db,
  input: {
    workspaceId: string;
    generationId: string;
    provider: string;
    model: string;
    kind: "image" | "video";
    file: {
      url: string;
      width?: number | null;
      height?: number | null;
      content_type?: string | null;
    };
  },
): Promise<string> {
  const response = await fetch(input.file.url);
  if (!response.ok) {
    throw new Error(`Failed to download generated asset: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const dir = assetStoreDir();
  await fs.mkdir(dir, { recursive: true });
  const assetId = randomUUID();
  await fs.writeFile(join(/* turbopackIgnore: true */ dir, assetId), buffer);

  await db.insert(assets).values({
    id: assetId,
    workspaceId: input.workspaceId,
    generationId: input.generationId,
    kind: input.kind,
    source: "generated",
    url: `/api/assets/${assetId}/content`,
    mime: input.file.content_type ?? (input.kind === "video" ? "video/mp4" : "image/png"),
    width: input.file.width ?? null,
    height: input.file.height ?? null,
    sizeBytes: buffer.length,
    provider: input.provider,
    model: input.model,
    status: "draft",
  });

  return assetId;
}

export async function startImageGeneration(
  db: Db,
  input: StartImageInput,
): Promise<{ id: string; requestId: string }> {
  const version = await resolveActiveVersion(db, input);
  if (!version) {
    throw new InvalidGenerationJobInputError(
      "No prompt version found; provide templateId or versionId",
    );
  }

  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(
      and(
        eq(promptTemplates.id, version.templateId),
        eq(promptTemplates.workspaceId, input.workspaceId),
      ),
    );
  if (!template) {
    throw new InvalidGenerationJobInputError(
      "No prompt version found; provide templateId or versionId",
    );
  }

  const { rendered, missing } = renderTemplate(
    version.template,
    input.variables,
    version.variables,
  );
  if (missing.length > 0) {
    throw new InvalidGenerationJobInputError(`Missing required variables: ${missing.join(", ")}`);
  }

  const model = input.model ?? DEFAULT_IMAGE_MODEL;
  const params = input.params ?? {};
  const imageInput = {
    prompt: rendered,
    image_size: typeof params.image_size === "string" ? params.image_size : undefined,
    seed: typeof params.seed === "number" ? params.seed : undefined,
  };

  const [snapshot] = await db
    .insert(promptSnapshots)
    .values({
      templateId: version.templateId,
      versionId: version.id,
      renderedText: rendered,
      variables: input.variables,
      model,
      params,
    })
    .returning({ id: promptSnapshots.id });

  const { requestId } = await submitImage(model, imageInput);

  const [generation] = await db
    .insert(generations)
    .values({
      workspaceId: input.workspaceId,
      purpose: template.purpose,
      templateId: template.id,
      versionId: version.id,
      promptSnapshotId: snapshot.id,
      provider: "fal",
      model,
      kind: "image",
      status: "queued",
      requestId,
      params,
    })
    .returning({ id: generations.id });

  return { id: generation.id, requestId };
}

export async function pollImageGeneration(db: Db, workspaceId: string, id: string) {
  const [generation] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
  if (!generation) {
    throw new Error("Generation not found");
  }
  if (generation.status === "succeeded" || generation.status === "failed") {
    return generation;
  }

  try {
    const status = await imageStatus(generation.model, generation.requestId!);
    if (status.status === "IN_QUEUE") {
      await db
        .update(generations)
        .set({ status: "queued", updatedAt: new Date() })
        .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
    } else if (status.status === "IN_PROGRESS") {
      await db
        .update(generations)
        .set({ status: "running", updatedAt: new Date() })
        .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
    } else {
      const result = await imageResult(generation.model, generation.requestId!);
      const image = result.images[0];
      await ingestAsset(db, {
        workspaceId: generation.workspaceId,
        generationId: id,
        provider: generation.provider,
        model: generation.model,
        kind: "image",
        file: {
          url: image.url,
          width: image.width,
          height: image.height,
          content_type: image.content_type,
        },
      });
      await db
        .update(generations)
        .set({ status: "succeeded", updatedAt: new Date() })
        .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
    }
  } catch (error) {
    await db
      .update(generations)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown generation error",
        updatedAt: new Date(),
      })
      .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
  }

  const [updated] = await db
    .select()
    .from(generations)
    .where(and(eq(generations.id, id), eq(generations.workspaceId, workspaceId)));
  if (!updated) {
    throw new Error("Generation not found");
  }
  return updated;
}
