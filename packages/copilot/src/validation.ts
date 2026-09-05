import type {
  CanonicalBase,
  CanonicalChange,
  CopilotResourceType,
  DiffItem,
  ProposalPayload,
  ValidationFinding,
} from "./contracts";
import { canonicalJson, createBaseFingerprint } from "./fingerprint";

export type { ValidationFinding } from "./contracts";

export interface ValidationContext {
  workspaceId: string;
  canonicalBases: readonly CanonicalBase[];
  owns(resourceType: CopilotResourceType, resourceId: string): Promise<boolean>;
  hasContextResource?(resourceType: "bible" | "entity" | "story_state"): Promise<boolean>;
  validateContinuity?(
    operation: CanonicalChange,
  ):
    | readonly Omit<ValidationFinding, "ordinal">[]
    | Promise<readonly Omit<ValidationFinding, "ordinal">[]>;
}

export type ProposalValidation = Readonly<{
  status: "valid" | "valid_with_warnings" | "invalid" | "stale";
  findings: readonly ValidationFinding[];
  baseFingerprint: string;
}>;

function resourceType(operation: CanonicalChange): CopilotResourceType {
  switch (operation.type) {
    case "entity.create":
    case "entity.revise":
    case "entity.archive":
      return operation.entityType;
    case "episode_plan.append":
      return "episode_plan";
    case "scene_set.replace_with_revision":
      return "scene";
    case "bible.append":
      return "bible";
    default:
      return "series";
  }
}

function targetId(operation: CanonicalChange): string | undefined {
  if ("targetId" in operation) return operation.targetId;
  if (operation.type === "bible.append") return operation.seriesId;
  if (operation.type === "episode_plan.append") return operation.seriesId;
  if (operation.type === "scene_set.replace_with_revision") return operation.planId;
  return undefined;
}

function ownershipResourceType(operation: CanonicalChange): CopilotResourceType {
  if (operation.type === "bible.append" || operation.type === "episode_plan.append")
    return "series";
  if (operation.type === "scene_set.replace_with_revision") return "episode_plan";
  return resourceType(operation);
}

function operationBase(operation: CanonicalChange): CanonicalBase | undefined {
  return "base" in operation ? operation.base : undefined;
}

function operationDependencies(operation: CanonicalChange): string[] {
  if (operation.type === "paid_job.request") return operation.targetRefs;
  if ("seriesRef" in operation && operation.seriesRef) return [operation.seriesRef];
  if ("planRef" in operation && operation.planRef) return [operation.planRef];
  return [];
}

function operationKind(operation: CanonicalChange): DiffItem["operation"] {
  if (operation.type.endsWith(".archive")) return "archive";
  if (operation.type === "paid_job.request") return "request";
  if (operation.type.endsWith(".create")) return "create";
  return "update";
}

export async function buildProposalDiff(
  payload: ProposalPayload,
  loadBefore?: (operation: CanonicalChange) => Promise<unknown>,
): Promise<readonly DiffItem[]> {
  const diff: DiffItem[] = [];
  for (const [operationOrdinal, operation] of payload.operations.entries()) {
    const before = loadBefore ? await loadBefore(operation) : undefined;
    const after = operation.type.endsWith(".archive") ? { status: "archived" } : operation;
    const common = {
      resourceType: resourceType(operation),
      resourceId: targetId(operation),
      clientRef: "clientRef" in operation ? operation.clientRef : undefined,
      operation: operationKind(operation),
      dependencies: operationDependencies(operation),
    };
    const keys = new Set([
      ...Object.keys(
        before && typeof before === "object" ? (before as Record<string, unknown>) : {},
      ),
      ...Object.keys(after),
    ]);
    for (const key of [...keys].sort()) {
      if (key === "base" || key === "clientRef" || key === "targetId" || key === "type") continue;
      const beforeValue =
        before && typeof before === "object" ? (before as Record<string, unknown>)[key] : undefined;
      const afterValue = (after as Record<string, unknown>)[key];
      if (
        beforeValue !== undefined &&
        afterValue !== undefined &&
        canonicalJson(beforeValue) === canonicalJson(afterValue)
      )
        continue;
      diff.push({
        ...common,
        ordinal: diff.length,
        fieldPath: `operations[${operationOrdinal}].${key}`,
        before: beforeValue,
        after: afterValue,
      });
    }
  }
  return diff;
}

export async function validateProposalChangeSet(
  changeSet: ProposalPayload,
  context: ValidationContext,
): Promise<ProposalValidation> {
  const rawFindings: Omit<ValidationFinding, "ordinal">[] = [];
  const refs = new Map<string, number>();
  for (const [index, operation] of changeSet.operations.entries()) {
    if ("clientRef" in operation) {
      const previous = refs.get(operation.clientRef);
      if (previous !== undefined) {
        rawFindings.push({
          severity: "blocking",
          code: "duplicate_client_ref",
          clientRef: operation.clientRef,
          message: "Local reference is duplicated",
        });
      } else refs.set(operation.clientRef, index);
    }
  }

  for (const [index, operation] of changeSet.operations.entries()) {
    const dependencies = operationDependencies(operation);
    for (const dependency of dependencies) {
      const dependencyPosition = refs.get(dependency);
      if (dependencyPosition === undefined) {
        rawFindings.push({
          severity: "blocking",
          code: "missing_dependency",
          clientRef: dependency,
          message: "A required proposal dependency is missing",
        });
      } else if (dependencyPosition >= index) {
        rawFindings.push({
          severity: "blocking",
          code: "dependency_order",
          clientRef: dependency,
          message: "Dependencies must precede their consumers",
        });
      }
    }

    const canonicalId = targetId(operation);
    const kind = resourceType(operation);
    if (canonicalId && !(await context.owns(ownershipResourceType(operation), canonicalId))) {
      rawFindings.push({
        severity: "blocking",
        code: "target_not_found",
        resourceType: kind,
        message: "Target not found",
      });
    }
    const base = operationBase(operation);
    if (base) {
      const current = context.canonicalBases.find(
        (candidate) =>
          candidate.resourceType === base.resourceType && candidate.resourceId === base.resourceId,
      );
      if (
        !current ||
        current.fingerprint !== base.fingerprint ||
        current.version !== base.version ||
        current.revisionId !== base.revisionId
      ) {
        rawFindings.push({
          severity: "blocking",
          code: "stale_base",
          resourceType: kind,
          resourceId: canonicalId,
          message: "Canonical resource changed after the draft was created",
        });
      }
    }
    if (operation.type === "scene_set.replace_with_revision" && operation.scenes.length === 0) {
      rawFindings.push({
        severity: "blocking",
        code: "missing_scenes",
        resourceType: "scene",
        message: "Episode screenplay requires ordered canonical scenes",
      });
    }
    if (operation.type === "episode_plan.append" && context.hasContextResource) {
      for (const required of ["bible", "story_state"] as const) {
        if (!(await context.hasContextResource(required))) {
          rawFindings.push({
            severity: "blocking",
            code: `missing_${required}`,
            resourceType: required === "story_state" ? "episode_plan" : required,
            message: `Episode planning requires active ${required.replace("_", " ")} context`,
          });
        }
      }
    }
    if (context.validateContinuity)
      rawFindings.push(...(await context.validateContinuity(operation)));
  }

  const findings = rawFindings.map((finding, ordinal) => ({ ...finding, ordinal }));
  const stale = findings.some((finding) =>
    ["stale_base", "stale_story_state_base", "stale_bible_base"].includes(finding.code),
  );
  const blocking = findings.some((finding) => finding.severity === "blocking");
  return {
    status: stale
      ? "stale"
      : blocking
        ? "invalid"
        : findings.length > 0
          ? "valid_with_warnings"
          : "valid",
    findings,
    baseFingerprint: createBaseFingerprint(context.canonicalBases),
  };
}
