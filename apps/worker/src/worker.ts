import { type Db } from "@ai-series/db";
import { claimNextJob, completeJob, failJob, setJobGeneration } from "@ai-series/jobs";
import {
  InvalidGenerationJobInputError,
  parseGenerationJobInput,
  pollImageGeneration,
  pollVideoGeneration,
  startImageGeneration,
  startVideoGeneration,
} from "@ai-series/generation";
import {
  estimateCost,
  recordCostActual,
  recordCostEstimate,
  resolveJobContext,
} from "@ai-series/ops";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "unknown worker error";
}

export function shouldRetryWorkerError(error: unknown): boolean {
  return !(error instanceof InvalidGenerationJobInputError);
}

export function verifiedProviderActualCost(evidence: unknown): number | undefined {
  if (
    typeof evidence !== "object" ||
    evidence === null ||
    !("source" in evidence) ||
    evidence.source !== "provider_response" ||
    !("verified" in evidence) ||
    evidence.verified !== true ||
    !("amount" in evidence) ||
    typeof evidence.amount !== "number" ||
    !Number.isFinite(evidence.amount) ||
    evidence.amount < 0
  ) {
    return undefined;
  }
  return evidence.amount;
}

export async function processOneJob(db: Db): Promise<boolean> {
  const claimed = await claimNextJob(db, ["image", "video", "image.generate", "video.generate"]);
  if (!claimed) {
    return false;
  }
  const { job, attempt } = claimed;
  const startedAt = Date.now();
  const kind = job.kind === "video" ? "video" : "image";
  const model = job.model ?? "unknown";
  const correlationId = job.idempotencyKey;
  const context = await resolveJobContext(db, job.id);

  await recordCostEstimate(db, {
    workspaceId: job.workspaceId,
    jobId: job.id,
    seriesId: context.seriesId ?? undefined,
    episodeNumber: context.episodeNumber ?? undefined,
    sceneId: context.sceneId ?? undefined,
    shotId: context.shotId ?? undefined,
    provider: "fal",
    model,
    kind,
    estimatedCost: estimateCost(kind, model),
    correlationId,
  });

  let status: "success" | "error" = "success";
  let errorText: string | undefined;

  try {
    const parsed = parseGenerationJobInput(job.kind, job.input, {
      workspaceId: job.workspaceId,
      model: job.model,
    });
    if (parsed.kind === "image") {
      const { id: generationId, requestId } = await startImageGeneration(db, parsed.input);
      await setJobGeneration(db, job.id, generationId, requestId);
      let generation;
      for (;;) {
        generation = await pollImageGeneration(db, job.workspaceId, generationId);
        if (generation.status === "succeeded" || generation.status === "failed") break;
        await Bun.sleep(2000);
      }
      if (generation.status === "succeeded") {
        await completeJob(db, job.id, { generationId }, attempt.id);
      } else {
        status = "error";
        errorText = generation.error ?? "image generation failed";
        await failJob(db, job.id, errorText, {
          retryable: true,
          attemptId: attempt.id,
        });
      }
    } else {
      const { id: generationId, requestId } = await startVideoGeneration(db, parsed.input);
      await setJobGeneration(db, job.id, generationId, requestId);
      let generation;
      for (;;) {
        generation = await pollVideoGeneration(db, job.workspaceId, generationId);
        if (generation.status === "succeeded" || generation.status === "failed") break;
        await Bun.sleep(3000);
      }
      if (generation.status === "succeeded") {
        await completeJob(db, job.id, { generationId }, attempt.id);
      } else {
        status = "error";
        errorText = generation.error ?? "video generation failed";
        await failJob(db, job.id, errorText, {
          retryable: true,
          attemptId: attempt.id,
        });
      }
    }
  } catch (error) {
    status = "error";
    errorText = message(error);
    await failJob(db, job.id, errorText, {
      retryable: shouldRetryWorkerError(error),
      attemptId: attempt.id,
    });
  }

  await recordCostActual(db, {
    workspaceId: job.workspaceId,
    jobId: job.id,
    seriesId: context.seriesId ?? undefined,
    episodeNumber: context.episodeNumber ?? undefined,
    sceneId: context.sceneId ?? undefined,
    shotId: context.shotId ?? undefined,
    provider: "fal",
    model,
    kind,
    status,
    durationMs: Date.now() - startedAt,
    // The current fal adapter exposes no provider-verified billing amount.
    // Persist the completion evidence with NULL actual_cost; the earlier
    // estimate remains available in its separate estimate-phase record.
    actualCost: verifiedProviderActualCost(undefined),
    correlationId,
    error: errorText,
  });

  return true;
}

export async function runWorkerLoop(db: Db, intervalMs = 2000): Promise<void> {
  for (;;) {
    try {
      const processed = await processOneJob(db);
      if (!processed) {
        await Bun.sleep(intervalMs);
      }
    } catch (error) {
      console.error("[worker] loop error:", message(error));
      await Bun.sleep(intervalMs);
    }
  }
}
