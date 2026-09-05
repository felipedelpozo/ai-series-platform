import type {
  BibleInputSchema,
  CanonicalBase,
  CanonicalChange,
  StoryStateInputSchema,
  ValidationFinding,
} from "./contracts";
import type { z } from "zod";

type BibleInput = z.infer<typeof BibleInputSchema>;
type StoryStateInput = z.infer<typeof StoryStateInputSchema>;
type ContinuityFinding = Omit<ValidationFinding, "ordinal">;

export type CanonicalContinuityDocument<T> = Readonly<{
  base: CanonicalBase;
  data: T;
  isCurrent: boolean;
}>;

export type DocumentedContinuityException = Readonly<{
  kind: "technical_deviation" | "policy_exception";
  canonicalRule: string;
  proposedStatement: string;
  policyStatement: string;
  rationale: string;
}>;

export type CanonicalContinuityContext = Readonly<{
  canonicalBases: readonly CanonicalBase[];
  bible: CanonicalContinuityDocument<BibleInput> | null;
  storyState: CanonicalContinuityDocument<StoryStateInput> | null;
  documentedExceptions?: readonly DocumentedContinuityException[];
}>;

type ProposedStatement = Readonly<{
  value: string;
  fieldPath: string;
  resourceType: "episode_plan" | "scene" | "shot";
  clientRef?: string;
  resourceId?: string;
}>;

const NEGATION =
  /\b(?:no longer|ya no|not|no|never|without|cannot|can't|isn't|aren't|wasn't|weren't|doesn't|don't|didn't|nunca|jam[aá]s|sin)\b/giu;

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function statementPolarity(value: string): Readonly<{ atom: string; negative: boolean }> {
  const negative = NEGATION.test(value);
  NEGATION.lastIndex = 0;
  return { atom: normalize(value.replace(NEGATION, " ")), negative };
}

function contradicts(canonicalRule: string, proposedStatement: string): boolean {
  const canonical = statementPolarity(canonicalRule);
  const proposed = statementPolarity(proposedStatement);
  return (
    canonical.atom.length > 0 &&
    canonical.atom === proposed.atom &&
    canonical.negative !== proposed.negative
  );
}

function sameBase(left: CanonicalBase, right: CanonicalBase): boolean {
  return (
    left.resourceType === right.resourceType &&
    left.resourceId === right.resourceId &&
    left.revisionId === right.revisionId &&
    left.version === right.version &&
    left.fingerprint === right.fingerprint
  );
}

function proposalStatements(operation: CanonicalChange): readonly ProposedStatement[] {
  if (operation.type === "episode_plan.append") {
    const statements: ProposedStatement[] = [];
    const add = (values: readonly string[], path: string) => {
      values.forEach((value, index) =>
        statements.push({
          value,
          fieldPath: `${path}[${index}]`,
          resourceType: "episode_plan",
          clientRef: operation.clientRef,
        }),
      );
    };
    add(operation.data.requiredContinuity, "data.requiredContinuity");
    add(operation.data.proposedStoryStateAfter.facts, "data.proposedStoryStateAfter.facts");
    add(operation.data.proposedStoryStateAfter.canon, "data.proposedStoryStateAfter.canon");
    return statements;
  }

  if (operation.type === "scene_set.replace_with_revision") {
    const statements: ProposedStatement[] = [];
    for (const [sceneIndex, scene] of operation.scenes.entries()) {
      const scenePrefix = `scenes[${sceneIndex}]`;
      for (const field of [
        "purpose",
        "action",
        "dialogue",
        "entryContinuity",
        "exitContinuity",
      ] as const) {
        if (scene[field].trim()) {
          statements.push({
            value: scene[field],
            fieldPath: `${scenePrefix}.${field}`,
            resourceType: "scene",
            resourceId: operation.planId,
          });
        }
      }
      for (const [shotIndex, shot] of scene.shots.entries()) {
        for (const [constraintIndex, value] of shot.continuityConstraints.entries()) {
          statements.push({
            value,
            fieldPath: `${scenePrefix}.shots[${shotIndex}].continuityConstraints[${constraintIndex}]`,
            resourceType: "shot",
            resourceId: operation.planId,
          });
        }
      }
    }
    return statements;
  }

  return [];
}

function documentedException(
  context: CanonicalContinuityContext,
  canonicalRule: string,
  proposedStatement: string,
): DocumentedContinuityException | undefined {
  const policies = new Set(context.bible?.data.narrativeRules.map(normalize) ?? []);
  return context.documentedExceptions?.find(
    (exception) =>
      exception.rationale.trim().length > 0 &&
      policies.has(normalize(exception.policyStatement)) &&
      normalize(exception.canonicalRule) === normalize(canonicalRule) &&
      normalize(exception.proposedStatement) === normalize(proposedStatement),
  );
}

function requiresStoryState(operation: CanonicalChange): boolean {
  return (
    operation.type === "episode_plan.append" || operation.type === "scene_set.replace_with_revision"
  );
}

/**
 * Validates deterministic continuity evidence only. Semantic interpretation remains outside this helper;
 * callers must supply canonical Bible/StoryState documents and server-authoritative documented exceptions.
 */
export function validateCanonicalContinuity(
  operation: CanonicalChange,
  context: CanonicalContinuityContext,
): readonly ContinuityFinding[] {
  if (!requiresStoryState(operation)) return [];

  if (!context.storyState) {
    return [
      {
        severity: "blocking",
        code: "missing_story_state",
        resourceType: "story_state",
        message: "Episode continuity requires the current canonical Story State",
        remediation: "Capture the current Story State and regenerate the proposal revision.",
      },
    ];
  }

  const capturedStoryStateBase = context.canonicalBases.find(
    (base) =>
      base.resourceType === "story_state" &&
      base.resourceId === context.storyState?.base.resourceId,
  );
  if (
    !context.storyState.isCurrent ||
    !capturedStoryStateBase ||
    !sameBase(capturedStoryStateBase, context.storyState.base)
  ) {
    return [
      {
        severity: "blocking",
        code: "stale_story_state_base",
        resourceType: "story_state",
        resourceId: context.storyState.base.resourceId,
        message: "The proposal does not reference the current exact Story State revision",
        remediation: "Refresh canonical context and regenerate the proposal revision and diff.",
      },
    ];
  }

  const capturedBibleBase = context.bible
    ? context.canonicalBases.find(
        (base) =>
          base.resourceType === "bible" && base.resourceId === context.bible?.base.resourceId,
      )
    : undefined;
  if (!context.bible) {
    return [
      {
        severity: "blocking",
        code: "missing_active_bible",
        resourceType: "bible",
        message: "Episode continuity requires the active Series Bible",
        remediation: "Capture the active Series Bible and regenerate the proposal revision.",
      },
    ];
  }
  if (
    !context.bible.isCurrent ||
    !capturedBibleBase ||
    !sameBase(capturedBibleBase, context.bible.base)
  ) {
    return [
      {
        severity: "blocking",
        code: "stale_bible_base",
        resourceType: "bible",
        resourceId: context.bible.base.resourceId,
        message: "The proposal does not reference the current exact Series Bible revision",
        remediation: "Refresh canonical context and regenerate the proposal revision and diff.",
      },
    ];
  }

  const canonicalRules = [
    ...context.bible.data.canon,
    ...context.bible.data.prohibitions,
    ...context.storyState.data.canon,
    ...context.storyState.data.facts,
  ];
  const findings: ContinuityFinding[] = [];
  const seen = new Set<string>();

  for (const statement of proposalStatements(operation)) {
    for (const canonicalRule of canonicalRules) {
      if (!contradicts(canonicalRule, statement.value)) continue;
      const key = `${statement.fieldPath}\u0000${normalize(canonicalRule)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const exception = documentedException(context, canonicalRule, statement.value);
      findings.push({
        severity: exception ? "warning" : "blocking",
        code: exception
          ? exception.kind === "technical_deviation"
            ? "continuity_technical_deviation_documented"
            : "continuity_exception_documented"
          : "continuity_conflict",
        resourceType: statement.resourceType,
        resourceId: statement.resourceId,
        clientRef: statement.clientRef,
        fieldPath: statement.fieldPath,
        message: exception
          ? `Documented continuity exception: ${exception.rationale}`
          : `Proposed statement contradicts canonical continuity: ${canonicalRule}`,
        remediation: exception
          ? `Keep the canonical policy exception visible during approval: ${exception.policyStatement}`
          : "Revise the proposed statement or supply an exception documented by an active canonical Bible policy.",
      });
    }
  }

  return findings;
}
