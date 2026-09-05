import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
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
import { assetStoreDir, ingestAsset, resolveActiveVersion } from "./image";
import { InvalidGenerationJobInputError } from "./job-input";

export type StartVideoInput = {
  workspaceId: string;
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
  const params = input.params ?? {};

  let model: string;
  let imageUrl: string | undefined;
  if (input.sourceAssetId) {
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, input.sourceAssetId), eq(assets.workspaceId, input.workspaceId)));
    if (!asset || asset.kind !== "image") {
      throw new InvalidGenerationJobInputError("Source asset not found or is not an image");
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
      workspaceId: input.workspaceId,
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

export async function pollVideoGeneration(db: Db, workspaceId: string, id: string) {
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
    const status = await videoStatus(generation.model, generation.requestId!);
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
