import { z } from "zod";
import {
  COPILOT_LIMITS,
  CopilotResourceRefSchema,
  GroundedAnswerSchema,
  type CopilotResourceRef,
  type GroundedAnswer,
  type IntentPart,
} from "./contracts";
import { decomposeIntent } from "./intake";

const GroundedResourceSchema = z.object({
  resource: CopilotResourceRefSchema,
  baseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  fields: z.record(z.string().max(200), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
export type GroundedResource = z.infer<typeof GroundedResourceSchema>;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

export function buildGroundedAnswer(
  question: string,
  authorizedResources: GroundedResource[],
): GroundedAnswer {
  const boundedQuestion = z.string().trim().min(1).max(COPILOT_LIMITS.message).parse(question);
  const resources = z
    .array(GroundedResourceSchema)
    .max(COPILOT_LIMITS.references)
    .parse(authorizedResources);
  if (resources.length === 0) {
    throw new Error("A grounded answer requires at least one authorized canonical source");
  }

  const requested = new Set(tokens(boundedQuestion));
  const scored = resources
    .map((resource) => {
      const searchable = tokens(
        `${resource.resource.label ?? ""} ${Object.keys(resource.fields).join(" ")} ${Object.values(resource.fields).join(" ")}`,
      );
      return { resource, score: searchable.filter((token) => requested.has(token)).length };
    })
    .sort((left, right) => right.score - left.score);
  const bestScore = scored[0]?.score ?? 0;
  const selected = scored.filter((candidate, index) => candidate.score === bestScore && index < 5);
  const sources = selected.map(({ resource }) => ({
    resource: resource.resource,
    fieldPaths: Object.keys(resource.fields).sort(),
    baseFingerprint: resource.baseFingerprint,
  }));
  const statements = selected.map(({ resource }) => {
    const label = resource.resource.label ?? resource.resource.type;
    const facts = Object.entries(resource.fields)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}: ${value ?? "—"}`)
      .join("; ");
    return `${label} — ${facts}`;
  });

  return GroundedAnswerSchema.parse({
    kind: "grounded_answer",
    text: statements.join("\n"),
    sources,
    deterministic: true,
  });
}

export type MixedIntentBoundary = {
  queries: IntentPart[];
  actionable: IntentPart[];
  requiresProposal: boolean;
  requiresCostConfirmation: boolean;
};

export function separateMixedIntent(input: string): MixedIntentBoundary {
  const intent = decomposeIntent(input);
  const queries = intent.parts.filter((part) => part.classification === "query");
  const actionable = intent.parts.filter((part) => part.classification !== "query");
  return {
    queries,
    actionable,
    requiresProposal: actionable.some((part) => part.classification !== "paid_job"),
    requiresCostConfirmation: actionable.some((part) => part.classification === "paid_job"),
  };
}

export function canonicalResourceLink(
  resource: Pick<CopilotResourceRef, "type" | "id"> & { planId?: string; seriesId?: string },
): string {
  if (["episode_plan", "scene", "shot"].includes(resource.type)) {
    if (!resource.planId && resource.type !== "episode_plan")
      throw new Error("Scene and shot links require a planId");
    return `/studio/${resource.type === "episode_plan" ? resource.id : resource.planId}`;
  }
  const seriesId = resource.type === "series" ? resource.id : resource.seriesId;
  if (!seriesId) throw new Error("Bible and entity links require a seriesId");
  return `/series?seriesId=${encodeURIComponent(seriesId)}`;
}
