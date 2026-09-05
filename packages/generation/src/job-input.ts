import type { StartImageInput } from "./image";
import type { StartVideoInput } from "./video";

export const PAID_GENERATION_OPERATIONS = ["image.generate", "video.generate"] as const;
export type PaidGenerationOperation = (typeof PAID_GENERATION_OPERATIONS)[number];

export const PAID_GENERATION_CATALOG = {
  "image.generate": {
    kind: "image",
    resolutions: [
      "square",
      "square_hd",
      "portrait_4_3",
      "portrait_16_9",
      "landscape_4_3",
      "landscape_16_9",
    ],
  },
  "video.generate": {
    kind: "video",
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    minimumDurationSeconds: 1,
    maximumDurationSeconds: 30,
  },
} as const;

export type ParsedGenerationJob =
  { kind: "image"; input: StartImageInput } | { kind: "video"; input: StartVideoInput };

export type PaidGenerationBilling = Readonly<{
  units: number;
  durationSeconds: number | null;
  resolution: string;
  aspectRatio: string | null;
}>;

export type PreparedPaidGenerationJob = ParsedGenerationJob & {
  billing: PaidGenerationBilling;
};

export class InvalidGenerationJobInputError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "InvalidGenerationJobInputError";
  }
}

function invalid(message: string): never {
  throw new InvalidGenerationJobInputError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) invalid(`Unsupported ${label} field: ${extras[0]}`);
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 500) {
    invalid(`Invalid ${field}`);
  }
  return value;
}

function optionalUuid(value: unknown, field: string): string | undefined {
  const parsed = optionalString(value, field);
  if (parsed === undefined) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(parsed)) {
    invalid(`Invalid ${field}`);
  }
  return parsed;
}

function optionalCatalogValue<const Values extends readonly string[]>(
  value: unknown,
  field: string,
  values: Values,
): Values[number] | undefined {
  const parsed = optionalString(value, field);
  if (parsed === undefined) return undefined;
  if (!values.some((candidate) => candidate === parsed)) invalid(`Invalid ${field}`);
  return parsed;
}

function parseVariables(value: unknown): Record<string, string> {
  if (!isRecord(value) || Object.keys(value).length > 100) {
    invalid("Invalid generation variables");
  }
  const variables: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      key.length === 0 ||
      key.length > 200 ||
      typeof entry !== "string" ||
      entry.length > 10_000
    ) {
      invalid("Invalid generation variables");
    }
    variables[key] = entry;
  }
  return variables;
}

function parseParams(value: unknown, kind: "image" | "video"): Record<string, unknown> {
  if (value === undefined) return {};
  if (!isRecord(value)) invalid("Invalid generation params");
  const allowed = kind === "image" ? ["image_size", "seed"] : ["aspect_ratio", "duration"];
  assertAllowedKeys(value, allowed, "generation params");
  if (kind === "image") {
    const imageSize = optionalCatalogValue(
      value.image_size,
      "image_size",
      PAID_GENERATION_CATALOG["image.generate"].resolutions,
    );
    if (
      value.seed !== undefined &&
      (typeof value.seed !== "number" || !Number.isSafeInteger(value.seed))
    ) {
      invalid("Invalid seed");
    }
    return { image_size: imageSize, seed: value.seed };
  }
  const duration = optionalString(value.duration, "duration");
  if (duration !== undefined && !/^(?:[1-9]|[12][0-9]|30)$/.test(duration)) {
    invalid("Invalid duration");
  }
  return {
    aspect_ratio: optionalCatalogValue(
      value.aspect_ratio,
      "aspect_ratio",
      PAID_GENERATION_CATALOG["video.generate"].aspectRatios,
    ),
    duration,
  };
}

function parsePayload(
  kind: "image",
  value: unknown,
  workspaceId: string,
  authoritativeModel?: string | null,
): StartImageInput;
function parsePayload(
  kind: "video",
  value: unknown,
  workspaceId: string,
  authoritativeModel?: string | null,
): StartVideoInput;
function parsePayload(
  kind: "image" | "video",
  value: unknown,
  workspaceId: string,
  authoritativeModel?: string | null,
): StartImageInput | StartVideoInput {
  if (!isRecord(value)) invalid("Invalid generation job input");
  assertAllowedKeys(
    value,
    kind === "image"
      ? ["workspaceId", "templateId", "versionId", "variables", "params", "model"]
      : ["workspaceId", "templateId", "versionId", "variables", "params", "model", "sourceAssetId"],
    "generation job",
  );
  if (value.workspaceId !== undefined && value.workspaceId !== workspaceId) {
    invalid("Generation job workspace mismatch");
  }
  const templateId = optionalUuid(value.templateId, "templateId");
  const versionId = optionalUuid(value.versionId, "versionId");
  if (Boolean(templateId) === Boolean(versionId)) {
    invalid("Exactly one of templateId or versionId is required");
  }
  const payloadModel = optionalString(value.model, "model");
  if (authoritativeModel && payloadModel && authoritativeModel !== payloadModel) {
    invalid("Generation job model mismatch");
  }
  const common = {
    workspaceId,
    templateId,
    versionId,
    variables: parseVariables(value.variables),
    params: parseParams(value.params, kind),
    model: authoritativeModel ?? payloadModel,
  };
  if (kind === "image") return common;
  return { ...common, sourceAssetId: optionalUuid(value.sourceAssetId, "sourceAssetId") };
}

export function parseGenerationJobInput(
  kind: unknown,
  value: unknown,
  authority: { workspaceId: string; model?: string | null },
): ParsedGenerationJob {
  if (kind === "image") {
    return {
      kind,
      input: parsePayload(kind, value, authority.workspaceId, authority.model),
    };
  }
  if (kind === "video") {
    return {
      kind,
      input: parsePayload(kind, value, authority.workspaceId, authority.model),
    };
  }
  return invalid("Unsupported generation job kind");
}

export function createPaidGenerationJob(input: {
  workspaceId: string;
  model: string;
  units: unknown;
  operation: { jobType: unknown; parameters: unknown };
}): PreparedPaidGenerationJob {
  const kind =
    input.operation.jobType === "image.generate"
      ? "image"
      : input.operation.jobType === "video.generate"
        ? "video"
        : invalid("Unsupported paid generation operation");
  if (!isRecord(input.operation.parameters)) invalid("Invalid paid generation parameters");
  if ("workspaceId" in input.operation.parameters || "model" in input.operation.parameters) {
    invalid("Paid generation tenant and model are server-authoritative");
  }
  if (!Number.isSafeInteger(input.units) || Number(input.units) < 1 || Number(input.units) > 100) {
    invalid("Invalid paid generation units");
  }
  const parsed = parseGenerationJobInput(
    kind,
    { ...input.operation.parameters, workspaceId: input.workspaceId, model: input.model },
    { workspaceId: input.workspaceId, model: input.model },
  );
  const duration = parsed.input.params?.duration;
  const resolution = parsed.input.params?.image_size;
  const aspectRatio = parsed.input.params?.aspect_ratio;
  return {
    ...parsed,
    billing: {
      units: Number(input.units),
      durationSeconds: typeof duration === "string" ? Number(duration) : null,
      resolution: typeof resolution === "string" ? resolution : "provider_default",
      aspectRatio: typeof aspectRatio === "string" ? aspectRatio : null,
    },
  };
}
