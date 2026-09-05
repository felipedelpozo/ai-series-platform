import { createHash } from "node:crypto";

export type CopilotRole = "viewer" | "editor" | "owner";
export type CanonicalResourceType =
  "series" | "bible" | "entity" | "story_state" | "episode_plan" | "scene" | "shot";

export type CanonicalBase = Readonly<{
  resourceType: CanonicalResourceType;
  resourceId: string;
  revisionId?: string;
  version?: number;
  fingerprint: string;
}>;

export type ContextSelection = Readonly<{
  seriesId?: string;
  episodePlanId?: string;
  episodeNumber?: number;
  resource?: Readonly<{ type: CanonicalResourceType; id: string }>;
}>;

export type CapturedCopilotContext = Readonly<{
  workspaceId: string;
  actorUserId: string;
  role: CopilotRole;
  seriesId?: string;
  episodePlanId?: string;
  episodeNumber?: number;
  resource?: Readonly<{ type: CanonicalResourceType; id: string }>;
  canonicalBases: readonly CanonicalBase[];
  context: Readonly<Record<string, unknown>>;
  fingerprint: string;
  capturedAt: string;
}>;

export interface CanonicalContextReader {
  getMembership(input: {
    workspaceId: string;
    actorUserId: string;
  }): Promise<{ role: CopilotRole } | null>;
  loadSeries(input: {
    workspaceId: string;
    seriesId: string;
  }): Promise<Readonly<Record<string, unknown>> | null>;
  loadActiveBible(input: {
    workspaceId: string;
    seriesId: string;
  }): Promise<Readonly<Record<string, unknown>> | null>;
  loadActiveEntities(input: {
    workspaceId: string;
    seriesId: string;
  }): Promise<readonly Readonly<Record<string, unknown>>[]>;
  loadStoryState(input: {
    workspaceId: string;
    seriesId: string;
  }): Promise<Readonly<Record<string, unknown>> | null>;
  loadEpisodePlan(input: {
    workspaceId: string;
    episodePlanId: string;
    seriesId?: string;
  }): Promise<Readonly<Record<string, unknown>> | null>;
  loadResource(input: {
    workspaceId: string;
    type: CanonicalResourceType;
    id: string;
    seriesId?: string;
  }): Promise<Readonly<Record<string, unknown>> | null>;
  basesFor(input: {
    workspaceId: string;
    records: readonly Readonly<Record<string, unknown>>[];
  }): Promise<readonly CanonicalBase[]>;
}

export type CaptureContextResult =
  | { ok: true; snapshot: CapturedCopilotContext }
  | { ok: false; code: "not_found" | "invalid_context"; message: string };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stable(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function contextFingerprint(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export async function captureAuthorizedContext(
  reader: CanonicalContextReader,
  input: {
    workspaceId: string;
    actorUserId: string;
    selection: ContextSelection;
    now?: Date;
  },
): Promise<CaptureContextResult> {
  const membership = await reader.getMembership(input);
  if (!membership) return { ok: false, code: "not_found", message: "Context not found" };

  const { selection } = input;
  if (
    (selection.episodePlanId || selection.episodeNumber || selection.resource) &&
    !selection.seriesId
  ) {
    return {
      ok: false,
      code: "invalid_context",
      message: "A Series context is required for the selected resource",
    };
  }

  const records: Readonly<Record<string, unknown>>[] = [];
  let series: Readonly<Record<string, unknown>> | null = null;
  let bible: Readonly<Record<string, unknown>> | null = null;
  let entities: readonly Readonly<Record<string, unknown>>[] = [];
  let storyState: Readonly<Record<string, unknown>> | null = null;
  let episodePlan: Readonly<Record<string, unknown>> | null = null;
  let resource: Readonly<Record<string, unknown>> | null = null;

  if (selection.seriesId) {
    series = await reader.loadSeries({ ...input, seriesId: selection.seriesId });
    if (!series) return { ok: false, code: "not_found", message: "Context not found" };
    [bible, entities, storyState] = await Promise.all([
      reader.loadActiveBible({ ...input, seriesId: selection.seriesId }),
      reader.loadActiveEntities({ ...input, seriesId: selection.seriesId }),
      reader.loadStoryState({ ...input, seriesId: selection.seriesId }),
    ]);
    records.push(series);
    if (bible) records.push(bible);
    records.push(...entities);
    if (storyState) records.push(storyState);
  }
  if (selection.episodePlanId) {
    episodePlan = await reader.loadEpisodePlan({
      ...input,
      episodePlanId: selection.episodePlanId,
      seriesId: selection.seriesId,
    });
    if (!episodePlan) return { ok: false, code: "not_found", message: "Context not found" };
    records.push(episodePlan);
  }
  if (selection.resource) {
    resource = await reader.loadResource({
      ...input,
      ...selection.resource,
      seriesId: selection.seriesId,
    });
    if (!resource) return { ok: false, code: "not_found", message: "Context not found" };
    records.push(resource);
  }

  const canonicalBases = [...(await reader.basesFor({ ...input, records }))].sort((left, right) =>
    `${left.resourceType}:${left.resourceId}`.localeCompare(
      `${right.resourceType}:${right.resourceId}`,
    ),
  );
  const context = Object.freeze({ series, bible, entities, storyState, episodePlan, resource });
  const fingerprint = contextFingerprint({
    workspaceId: input.workspaceId,
    selection,
    canonicalBases,
  });

  return {
    ok: true,
    snapshot: Object.freeze({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      role: membership.role,
      ...selection,
      canonicalBases,
      context,
      fingerprint,
      capturedAt: (input.now ?? new Date()).toISOString(),
    }),
  };
}
