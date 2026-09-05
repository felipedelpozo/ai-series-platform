import { describe, expect, it } from "bun:test";
import type {
  BibleInputSchema,
  CanonicalBase,
  CanonicalChange,
  StoryStateInputSchema,
} from "./contracts";
import { validateCanonicalContinuity, type CanonicalContinuityContext } from "./continuity";
import { validateProposalChangeSet } from "./validation";
import type { z } from "zod";

const bibleBase: CanonicalBase = {
  resourceType: "bible",
  resourceId: "00000000-0000-4000-8000-000000000010",
  revisionId: "00000000-0000-4000-8000-000000000011",
  version: 2,
  fingerprint: "a".repeat(64),
};
const storyStateBase: CanonicalBase = {
  resourceType: "story_state",
  resourceId: "00000000-0000-4000-8000-000000000020",
  revisionId: "00000000-0000-4000-8000-000000000020",
  version: 4,
  fingerprint: "b".repeat(64),
};

const bible: z.infer<typeof BibleInputSchema> = {
  title: "Night City",
  premise: "A courier protects a living city.",
  genre: "Thriller",
  tone: "Tense",
  audience: "Adult",
  format: "Vertical",
  language: "English",
  episodeDuration: "60 seconds",
  narrativeRules: ["A one-episode technical deviation may be documented for dramatic irony"],
  visualStyle: "Neon noir",
  canon: ["The city is safe"],
  prohibitions: ["No time travel"],
  description: "A serialized urban mystery.",
};

const storyState: z.infer<typeof StoryStateInputSchema> = {
  currentEpisode: 1,
  characters: [],
  inventory: [],
  facts: ["The key is hidden"],
  goals: [],
  secretsKnown: [],
  secretsUnknown: [],
  openQuestions: [],
  pastDecisions: [],
  pendingConsequences: [],
  canon: [],
};

const operation: CanonicalChange = {
  type: "episode_plan.append",
  clientRef: "episode-one",
  seriesId: "00000000-0000-4000-8000-000000000030",
  episodeNumber: 1,
  data: {
    hook: "The alarm sounds.",
    dramaticGoal: "Find the courier.",
    beats: ["Alarm", "Search"],
    targetDuration: "60 seconds",
    characterIds: [],
    locationIds: [],
    propIds: [],
    reveals: [],
    requiredContinuity: [],
    closing: "The gate opens.",
    cliffhanger: "The city is not safe.",
    audienceQuestion: null,
    proposedStoryStateAfter: { ...storyState, facts: ["The city is not safe"] },
  },
};

function context(overrides: Partial<CanonicalContinuityContext> = {}): CanonicalContinuityContext {
  return {
    canonicalBases: [bibleBase, storyStateBase],
    bible: { base: bibleBase, data: bible, isCurrent: true },
    storyState: { base: storyStateBase, data: storyState, isCurrent: true },
    ...overrides,
  };
}

describe("canonical continuity validation", () => {
  it("blocks a proposal statement that contradicts the active Bible", () => {
    expect(validateCanonicalContinuity(operation, context())).toEqual([
      expect.objectContaining({
        severity: "blocking",
        code: "continuity_conflict",
        resourceType: "episode_plan",
        clientRef: "episode-one",
        fieldPath: "data.proposedStoryStateAfter.facts[0]",
      }),
    ]);
  });

  it("downgrades an exact conflict to a warning only under an active documented policy", () => {
    const policyStatement = bible.narrativeRules[0]!;
    const findings = validateCanonicalContinuity(
      operation,
      context({
        documentedExceptions: [
          {
            kind: "policy_exception",
            canonicalRule: "The city is safe",
            proposedStatement: "The city is not safe",
            policyStatement,
            rationale: "Episode one uses an unreliable narrator; the city itself remains safe.",
          },
        ],
      }),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "continuity_exception_documented",
        message: expect.stringContaining("unreliable narrator"),
        remediation: expect.stringContaining(policyStatement),
      }),
    ]);
  });

  it("blocks episode validation when the captured Story State is no longer current", () => {
    const findings = validateCanonicalContinuity(
      operation,
      context({ storyState: { base: storyStateBase, data: storyState, isCurrent: false } }),
    );

    expect(findings).toEqual([
      expect.objectContaining({
        severity: "blocking",
        code: "stale_story_state_base",
        resourceType: "story_state",
      }),
    ]);
  });

  it("classifies an obsolete Story State base as a stale proposal", async () => {
    const continuityContext = context({
      storyState: { base: storyStateBase, data: storyState, isCurrent: false },
    });
    const validation = await validateProposalChangeSet(
      { schemaVersion: 1, operations: [operation] },
      {
        workspaceId: "00000000-0000-4000-8000-000000000040",
        canonicalBases: continuityContext.canonicalBases,
        owns: async () => true,
        hasContextResource: async () => true,
        validateContinuity: (change) => validateCanonicalContinuity(change, continuityContext),
      },
    );

    expect(validation.status).toBe("stale");
  });

  it("does not trust an exception whose policy is absent from the active Bible", () => {
    const findings = validateCanonicalContinuity(
      operation,
      context({
        documentedExceptions: [
          {
            kind: "policy_exception",
            canonicalRule: "The city is safe",
            proposedStatement: "The city is not safe",
            policyStatement: "Anything may change",
            rationale: "Untrusted proposal metadata",
          },
        ],
      }),
    );

    expect(findings[0]).toMatchObject({ severity: "blocking", code: "continuity_conflict" });
  });
});
