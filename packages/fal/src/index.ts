import { fal } from "@fal-ai/client";
import { z } from "zod";

export const DEFAULT_IMAGE_MODEL = "fal-ai/nano-banana-2";
export const DEFAULT_VIDEO_MODEL_T2V = "minimax/h3-max/text-to-video";
export const DEFAULT_VIDEO_MODEL_I2V = "minimax/h3-max/image-to-video";

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

export const VideoInputSchema = z.object({
  prompt: z.string().min(1),
  image_url: z.string().optional(),
  aspect_ratio: z.string().optional(),
  duration: z.string().optional(),
});
export type VideoInput = z.infer<typeof VideoInputSchema>;

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

export const FalVideoResultSchema = z.object({
  video: z.object({
    url: z.string(),
    content_type: z.string().nullable().optional(),
    file_name: z.string().nullable().optional(),
    file_size: z.number().nullable().optional(),
  }),
});
export type FalVideoResult = z.infer<typeof FalVideoResultSchema>;

function configure(): void {
  const key = process.env.FAL_KEY;
  if (!key || key.trim() === "") {
    throw new FalError("FAL_KEY is not set");
  }
  fal.config({ credentials: key });
}

async function submitQueue(
  model: string,
  input: Record<string, unknown>,
): Promise<{ requestId: string }> {
  configure();
  try {
    const status = await fal.queue.submit(model, { input });
    return { requestId: status.request_id };
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to submit generation", error);
  }
}

async function queueStatus(model: string, requestId: string): Promise<FalStatus> {
  configure();
  try {
    const status = await fal.queue.status(model, { requestId });
    return FalStatusSchema.parse(status);
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to fetch generation status", error);
  }
}

async function queueResult(model: string, requestId: string): Promise<unknown> {
  configure();
  try {
    const result = await fal.queue.result(model, { requestId });
    return result.data;
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to fetch generation result", error);
  }
}

export async function submitImage(
  model: string,
  input: ImageInput,
): Promise<{ requestId: string }> {
  return submitQueue(model, input);
}

export async function imageStatus(model: string, requestId: string): Promise<FalStatus> {
  return queueStatus(model, requestId);
}

export async function imageResult(model: string, requestId: string): Promise<FalImageResult> {
  return FalImageResultSchema.parse(await queueResult(model, requestId));
}

export async function submitVideo(
  model: string,
  input: VideoInput,
): Promise<{ requestId: string }> {
  return submitQueue(model, input);
}

export async function videoStatus(model: string, requestId: string): Promise<FalStatus> {
  return queueStatus(model, requestId);
}

export async function videoResult(model: string, requestId: string): Promise<FalVideoResult> {
  return FalVideoResultSchema.parse(await queueResult(model, requestId));
}

export async function uploadImage(buffer: Buffer, mime: string): Promise<string> {
  configure();
  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: mime });
    return await fal.storage.upload(blob);
  } catch (error) {
    if (error instanceof FalError) throw error;
    throw new FalError("Failed to upload source image", error);
  }
}
