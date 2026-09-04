import { fal } from "@fal-ai/client";
import { z } from "zod";

export const DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana-2";

export class FalError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FalError";
  }
}

export const ImageInputSchema = z.object({
  prompt: z.string().min(1),
  image_size: z.string().optional(),
  seed: z.number().int().optional(),
});
export type ImageInput = z.infer<typeof ImageInputSchema>;

export const FalStatusSchema = z.object({
  status: z.enum(["IN_QUEUE", "IN_PROGRESS", "COMPLETED"]),
  request_id: z.string(),
});
export type FalStatus = z.infer<typeof FalStatusSchema>;

export const FalImageResultSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string(),
        width: z.number().int().nullable().optional(),
        height: z.number().int().nullable().optional(),
        content_type: z.string().nullable().optional(),
      }),
    )
    .min(1),
});
export type FalImageResult = z.infer<typeof FalImageResultSchema>;

function configure(): void {
  const key = process.env.FAL_KEY;
  if (!key || key.trim() === "") {
    throw new FalError("FAL_KEY is not set");
  }
  fal.config({ credentials: key });
}

export async function submitImage(
  model: string,
  input: ImageInput,
): Promise<{ requestId: string }> {
  configure();
  try {
    const status = await fal.queue.submit(model, { input });
    return { requestId: status.request_id };
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to submit image generation", error);
  }
}

export async function imageStatus(model: string, requestId: string): Promise<FalStatus> {
  configure();
  try {
    const status = await fal.queue.status(model, { requestId });
    return FalStatusSchema.parse(status);
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to fetch generation status", error);
  }
}

export async function imageResult(model: string, requestId: string): Promise<FalImageResult> {
  configure();
  try {
    const result = await fal.queue.result(model, { requestId });
    return FalImageResultSchema.parse(result.data);
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to fetch generation result", error);
  }
}
