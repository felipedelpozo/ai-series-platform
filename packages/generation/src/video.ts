import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { assets, generations, promptSnapshots, promptTemplates, type Db } from "@ai-series/db";
import {
  DEFAULT_VIDEO_MODEL_I2V,
  DEFAULT_VIDEO_MODEL_T2V,
  submitVideo,
  uploadImage,
  videoResult,
  videoStatus,
} from "@ai-series/fal";
import { renderTemplate } from "@ai-series/prompts";
import { assetStoreDir, ingestAsset, resolveActiveVersion, resolveWorkspaceId } from "./image";

export type StartVideoInput = {
  templateId?: string;
  versionId?: string;
  variables: Record<string, string>;
  params?: Record<string, unknown>;
  model?: string;
  sourceAssetId?: string;
};

export async function startVideoGeneration(
  db: Db,
  input: StartVideoInput,
): Promise<{ id: string; requestId: string }> {
  const workspaceId = await resolveWorkspaceId(db);
  const version = await resolveActiveVersion(db, input);
  if (!version) {
    throw new Error("No prompt version found; provide templateId or versionId");
  }

  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(eq(promptTemplates.id, version.templateId));

  const { rendered, missing } = renderTemplate(version.template, input.variables, version.variables);
  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(", ")}`);
  }
  const params = input.params ?? {};

  let model: string;
  let imageUrl: string | undefined;
  if (input.sourceAssetId) {
    const [asset] = await db.select().from(assets).where(eq(assets.id, input.sourceAssetId));
    if (!asset || asset.kind !== "image") {
      throw new Error("Source asset not found or is not an image");
    }
    const buffer = await readFile(join(assetStoreDir(), asset.id));
    imageUrl = await uploadImage(buffer, asset.mime ?? "image/png");
    model = input.model ?? DEFAULT_VIDEO_MODEL_I2V;
  } else {
    model = input.model ?? DEFAULT_VIDEO_MODEL_T2V;
  }

  const videoInput = {
    prompt: rendered,
    image_url: imageUrl,
    aspect_ratio: typeof params.aspect_ratio === "string" ? params.aspect_ratio : undefined,
    duration: typeof params.duration === "string" ? params.duration : undefined,
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

  const { requestId } = await submitVideo(model, videoInput);

  const [generation] = await db
    .insert(generations)
    .values({
      workspaceId,
      purpose: template.purpose,
      templateId: template.id,
      versionId: version.id,
      promptSnapshotId: snapshot.id,
      provider: "fal",
      model,
      kind: "video",
      status: "queued",
      requestId,
      params,
    })
    .returning({ id: generations.id });

  return { id: generation.id, requestId };
}

export async function pollVideoGeneration(db: Db, id: string) {
  const [generation] = await db.select().from(generations).where(eq(generations.id, id));
  if (!generation) {
    throw new Error("Generation not found");
  }
  if (generation.status === "succeeded" || generation.status === "failed") {
    return generation;
  }

  try {
    const status = await videoStatus(generation.model, generation.requestId!);
    if (status.status === "IN_QUEUE") {
      await db
        .update(generations)
        .set({ status: "queued", updatedAt: new Date() })
        .where(eq(generations.id, id));
    } else if (status.status === "IN_PROGRESS") {
      await db
        .update(generations)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(generations.id, id));
    } else {
      const result = await videoResult(generation.model, generation.requestId!);
      await ingestAsset(db, {
        workspaceId: generation.workspaceId,
        generationId: id,
        provider: generation.provider,
        model: generation.model,
        kind: "video",
        file: { url: result.video.url, content_type: result.video.content_type },
      });
      await db
        .update(generations)
        .set({ status: "succeeded", updatedAt: new Date() })
        .where(eq(generations.id, id));
    }
  } catch (error) {
    await db
      .update(generations)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown generation error",
        updatedAt: new Date(),
      })
      .where(eq(generations.id, id));
  }

  const [updated] = await db.select().from(generations).where(eq(generations.id, id));
  return updated!;
}
