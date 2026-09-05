import { z } from "zod";

export type CopilotPromptPurpose = "copilot.answer" | "copilot.proposal";

export type ConfirmedInference = Readonly<{
  workspaceId: string;
  actorUserId: string;
  conversationId: string;
  messageId: string;
  confirmationId: string;
  quoteId: string;
  quoteFingerprint: string;
  scopeFingerprint: string;
  quotaFingerprint: string;
  promptSnapshotId: string;
  promptSnapshotFingerprint: string;
  promptPurpose: CopilotPromptPurpose;
  promptVersionId: string;
  promptVersion: number;
}>;

export type InferenceReservation = ConfirmedInference &
  Readonly<{
    reservationId: string;
    provider: string;
    model: string;
    renderedPrompt: string;
    maximumCost: number;
    currency: string;
  }>;

export type CopilotModelResult = Readonly<{
  object: unknown;
  provider: string;
  model: string;
  resolvedModel?: string;
  usage: Readonly<{ inputUnits: number; outputUnits: number; totalUnits: number }>;
  durationMs: number;
  actualCost?: number;
  providerRequestId?: string;
}>;

export interface CopilotModelPort {
  generate(input: {
    renderedPrompt: string;
    schema: z.ZodTypeAny;
    provider: string;
    model: string;
  }): Promise<CopilotModelResult>;
}

export interface InferenceAccountingPort {
  reserveExact(input: ConfirmedInference): Promise<InferenceReservation>;
  finish(input: {
    reservation: InferenceReservation;
    status: "succeeded" | "failed";
    inputUnits: number;
    outputUnits: number;
    durationMs: number;
    actualCost?: number;
    providerRequestId?: string;
    resolvedModel?: string;
    generatedRevisionId?: string;
    failureCode?: string;
  }): Promise<void>;
}

export class CopilotGenerationError extends Error {
  constructor(readonly code: "provider_failed" | "invalid_output" | "accounting_failed") {
    super(
      code === "provider_failed"
        ? "The generation provider is temporarily unavailable"
        : code === "invalid_output"
          ? "The generation result was invalid"
          : "The generation result could not be reconciled",
    );
    this.name = "CopilotGenerationError";
  }
}

function validUsage(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isExactReservation(
  confirmation: ConfirmedInference,
  reservation: InferenceReservation,
): boolean {
  return (
    confirmation.workspaceId === reservation.workspaceId &&
    confirmation.actorUserId === reservation.actorUserId &&
    confirmation.conversationId === reservation.conversationId &&
    confirmation.messageId === reservation.messageId &&
    confirmation.confirmationId === reservation.confirmationId &&
    confirmation.quoteId === reservation.quoteId &&
    confirmation.quoteFingerprint === reservation.quoteFingerprint &&
    confirmation.scopeFingerprint === reservation.scopeFingerprint &&
    confirmation.quotaFingerprint === reservation.quotaFingerprint &&
    confirmation.promptSnapshotId === reservation.promptSnapshotId &&
    confirmation.promptSnapshotFingerprint === reservation.promptSnapshotFingerprint &&
    confirmation.promptPurpose === reservation.promptPurpose &&
    confirmation.promptVersionId === reservation.promptVersionId &&
    confirmation.promptVersion === reservation.promptVersion
  );
}

async function finishOrThrow(
  accounting: InferenceAccountingPort,
  input: Parameters<InferenceAccountingPort["finish"]>[0],
): Promise<void> {
  try {
    await accounting.finish(input);
  } catch {
    throw new CopilotGenerationError("accounting_failed");
  }
}

/**
 * Runs only after the accounting port atomically validates and consumes an
 * exact economic confirmation. The model never receives authority-bearing IDs.
 */
export async function generateConfirmedCopilotObject<TSchema extends z.ZodTypeAny>(input: {
  confirmation: ConfirmedInference;
  schema: TSchema;
  modelPort: CopilotModelPort;
  accounting: InferenceAccountingPort;
  generatedRevisionId?: string;
}): Promise<z.infer<TSchema>> {
  const reservation = await input.accounting.reserveExact(input.confirmation);
  if (!isExactReservation(input.confirmation, reservation)) {
    throw new CopilotGenerationError("accounting_failed");
  }
  let modelResult: CopilotModelResult;
  try {
    modelResult = await input.modelPort.generate({
      renderedPrompt: reservation.renderedPrompt,
      schema: input.schema,
      provider: reservation.provider,
      model: reservation.model,
    });
  } catch {
    await finishOrThrow(input.accounting, {
      reservation,
      status: "failed",
      inputUnits: 0,
      outputUnits: 0,
      durationMs: 0,
      failureCode: "provider_failed",
    });
    throw new CopilotGenerationError("provider_failed");
  }

  if (modelResult.provider !== reservation.provider || modelResult.model !== reservation.model) {
    await finishOrThrow(input.accounting, {
      reservation,
      status: "failed",
      inputUnits: validUsage(modelResult.usage.inputUnits),
      outputUnits: validUsage(modelResult.usage.outputUnits),
      durationMs: validUsage(modelResult.durationMs),
      failureCode: "provider_mismatch",
    });
    throw new CopilotGenerationError("invalid_output");
  }

  const parsed = input.schema.safeParse(modelResult.object);
  if (!parsed.success) {
    await finishOrThrow(input.accounting, {
      reservation,
      status: "failed",
      inputUnits: validUsage(modelResult.usage.inputUnits),
      outputUnits: validUsage(modelResult.usage.outputUnits),
      durationMs: validUsage(modelResult.durationMs),
      failureCode: "invalid_output",
    });
    throw new CopilotGenerationError("invalid_output");
  }

  await finishOrThrow(input.accounting, {
    reservation,
    status: "succeeded",
    inputUnits: validUsage(modelResult.usage.inputUnits),
    outputUnits: validUsage(modelResult.usage.outputUnits),
    durationMs: validUsage(modelResult.durationMs),
    ...(modelResult.actualCost !== undefined ? { actualCost: modelResult.actualCost } : {}),
    ...(modelResult.providerRequestId ? { providerRequestId: modelResult.providerRequestId } : {}),
    ...(modelResult.resolvedModel ? { resolvedModel: modelResult.resolvedModel } : {}),
    ...(input.generatedRevisionId ? { generatedRevisionId: input.generatedRevisionId } : {}),
  });
  return parsed.data;
}
