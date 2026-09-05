import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const DEFAULT_LLM_MODEL = "gpt-4o-mini";

export class AiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

function resolveModel(name?: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiError("OPENAI_API_KEY is not set");
  }
  return openai(name ?? DEFAULT_LLM_MODEL);
}

export async function generateStructured<T extends z.ZodTypeAny>(input: {
  prompt: string;
  schema: T;
  model?: string;
}): Promise<z.infer<T>> {
  try {
    const result = await generateObject({
      model: resolveModel(input.model),
      schema: input.schema,
      prompt: input.prompt,
    });
    return result.object as z.infer<T>;
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(
      `Structured generation failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }
}

export {
  calculateCopilotActualCost,
  COPILOT_AI_LIMITS,
  estimateCopilotMaximumCost,
  generateCopilotObject,
  getCopilotInferenceMetadata,
  normalizeCopilotUsage,
} from "./copilot";
export type {
  CopilotInferenceMetadata,
  CopilotObjectResult,
  CopilotTokenPricing,
  CopilotTokenUsage,
} from "./copilot";
