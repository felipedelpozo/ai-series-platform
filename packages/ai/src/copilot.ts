import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Buffer } from "node:buffer";
import { z } from "zod";
import { AiError, DEFAULT_LLM_MODEL } from "./index";

export type CopilotTokenUsage = Readonly<{
  inputUnits: number;
  outputUnits: number;
  totalUnits: number;
}>;

export const COPILOT_AI_LIMITS = Object.freeze({
  maxPromptCharacters: 100_000,
  maxOutputTokens: 4_096,
});

export type CopilotInferenceMetadata = Readonly<{
  provider: "openai";
  model: string;
  promptCharacters: number;
  promptUtf8Bytes: number;
  maximumInputTokens: number;
  maximumOutputTokens: number;
}>;

export type CopilotTokenPricing = Readonly<{
  currency: string;
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
}>;

export type CopilotObjectResult<T> = Readonly<{
  object: T;
  provider: "openai";
  model: string;
  resolvedModel: string;
  usage: CopilotTokenUsage;
  durationMs: number;
  providerRequestId: string;
  providerMetadata?: Readonly<Record<string, unknown>>;
}>;

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function normalizeCopilotUsage(usage: unknown): CopilotTokenUsage {
  const value = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
  const inputUnits = nonNegativeInteger(value.inputTokens ?? value.promptTokens);
  const outputUnits = nonNegativeInteger(value.outputTokens ?? value.completionTokens);
  return {
    inputUnits,
    outputUnits,
    totalUnits: nonNegativeInteger(value.totalTokens) || inputUnits + outputUnits,
  };
}

function allowedModels(): ReadonlySet<string> {
  const configured = process.env.COPILOT_ALLOWED_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : [DEFAULT_LLM_MODEL]);
}

function validateModel(model: string): void {
  if (!allowedModels().has(model)) throw new AiError("Copilot model is not allowed");
}

export function getCopilotInferenceMetadata(input: {
  prompt: string;
  model: string;
}): CopilotInferenceMetadata {
  validateModel(input.model);
  if (!input.prompt.trim() || input.prompt.length > COPILOT_AI_LIMITS.maxPromptCharacters) {
    throw new AiError("Copilot prompt is outside the allowed size");
  }
  const promptUtf8Bytes = Buffer.byteLength(input.prompt, "utf8");
  return {
    provider: "openai",
    model: input.model,
    promptCharacters: input.prompt.length,
    promptUtf8Bytes,
    // A byte upper bound is conservative for the provider's BPE tokenization
    // and avoids depending on a vendor tokenizer in the domain boundary.
    maximumInputTokens: promptUtf8Bytes,
    maximumOutputTokens: COPILOT_AI_LIMITS.maxOutputTokens,
  };
}

function validatePricing(pricing: CopilotTokenPricing): void {
  if (
    !/^[A-Z]{3}$/.test(pricing.currency) ||
    !Number.isFinite(pricing.inputPerMillionTokens) ||
    pricing.inputPerMillionTokens < 0 ||
    !Number.isFinite(pricing.outputPerMillionTokens) ||
    pricing.outputPerMillionTokens < 0
  ) {
    throw new AiError("Copilot token pricing is invalid");
  }
}

function ceilingSixDecimals(amount: number): string {
  return (Math.ceil(amount * 1_000_000) / 1_000_000).toFixed(6);
}

/** Pure calculation; callers must supply current server-owned pricing. */
export function estimateCopilotMaximumCost(
  metadata: CopilotInferenceMetadata,
  pricing: CopilotTokenPricing,
): { currency: string; maximumAmount: string } {
  validatePricing(pricing);
  const amount =
    (metadata.maximumInputTokens * pricing.inputPerMillionTokens +
      metadata.maximumOutputTokens * pricing.outputPerMillionTokens) /
    1_000_000;
  return { currency: pricing.currency, maximumAmount: ceilingSixDecimals(amount) };
}

/** Pure post-call attribution using provider-reported token usage. */
export function calculateCopilotActualCost(
  usage: CopilotTokenUsage,
  pricing: CopilotTokenPricing,
): { currency: string; actualAmount: string } {
  validatePricing(pricing);
  const amount =
    (nonNegativeInteger(usage.inputUnits) * pricing.inputPerMillionTokens +
      nonNegativeInteger(usage.outputUnits) * pricing.outputPerMillionTokens) /
    1_000_000;
  return { currency: pricing.currency, actualAmount: ceilingSixDecimals(amount) };
}

/**
 * Provider adapter for a previously authorized copilot inference. Economic
 * authorization deliberately lives in @ai-series/copilot, not in this adapter.
 */
export async function generateCopilotObject<TSchema extends z.ZodTypeAny>(input: {
  prompt: string;
  schema: TSchema;
  model: string;
}): Promise<CopilotObjectResult<z.infer<TSchema>>> {
  if (!process.env.OPENAI_API_KEY) throw new AiError("OPENAI_API_KEY is not set");
  getCopilotInferenceMetadata(input);

  const startedAt = performance.now();
  try {
    const result = await generateObject({
      model: openai(input.model),
      schema: input.schema,
      prompt: input.prompt,
      maxOutputTokens: COPILOT_AI_LIMITS.maxOutputTokens,
    });
    return {
      object: result.object as z.infer<TSchema>,
      provider: "openai",
      model: input.model,
      resolvedModel: result.response.modelId,
      usage: normalizeCopilotUsage(result.usage),
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      providerRequestId: result.response.id,
      ...(result.providerMetadata
        ? { providerMetadata: result.providerMetadata as Readonly<Record<string, unknown>> }
        : {}),
    };
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError("Copilot structured generation failed", error);
  }
}
