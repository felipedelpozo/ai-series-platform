import { describe, expect, test } from "bun:test";
import {
  CanonicalChangeSchema,
  CopilotContextSchema,
  CopilotResourceTypeSchema,
  CostQuoteSchema,
  EpisodePlanInputSchema,
  ProposalPayloadSchema,
  ProposalRevisionSchema,
  StoryStateInputSchema,
} from "./contracts";
import { CopilotError, resourceNotFound, toSafeCopilotError } from "./errors";
import {
  createBaseFingerprint,
  createContentFingerprint,
  createDiffFingerprint,
  createRevisionFingerprint,
} from "./fingerprint";

const ids = {
  workspace: "11111111-1111-4111-8111-111111111111",
  user: "22222222-2222-4222-8222-222222222222",
  proposal: "33333333-3333-4333-8333-333333333333",
  revision: "44444444-4444-4444-8444-444444444444",
};
const fp = "a".repeat(64);

const bible = {
  title: "La ciudad",
  premise: "Una ciudad cambia cada noche.",
  genre: "thriller",
  tone: "misterioso",
  audience: "adultos",
  format: "vertical",
  language: "es",
  episodeDuration: "60s",
  narrativeRules: ["Una pista por episodio"],
  visualStyle: "Noir urbano",
  canon: ["La puerta aparece a medianoche"],
  prohibitions: ["No explicar el origen"],
  description: "Thriller serializado",
};
const character = {
  role: "protagonista",
  apparentAge: "30",
  appearance: "Pelo oscuro",
  distinctiveTraits: ["cicatriz"],
  wardrobe: "gabardina",
  personality: "observadora",
  voice: "serena",
  state: "busca la puerta",
  visualRules: ["siempre lleva una llave"],
};

describe("copilot change contracts", () => {
  test("accepts a complete series/Bible/entities bundle without canonical writes", () => {
    const payload = ProposalPayloadSchema.parse({
      schemaVersion: 1,
      operations: [
        { type: "series.create", clientRef: "series:new", name: "La ciudad" },
        { type: "bible.append", seriesRef: "series:new", data: bible },
        {
          type: "entity.create",
          clientRef: "character:lead",
          seriesRef: "series:new",
          entityType: "character",
          name: "Vera",
          data: character,
        },
      ],
    });
    expect(payload.operations).toHaveLength(3);
  });

  test("does not offer Season or a generic canonical resource escape hatch", () => {
    expect(CopilotResourceTypeSchema.safeParse("season").success).toBe(false);
    expect(CanonicalChangeSchema.safeParse({ type: "season.create", data: {} }).success).toBe(
      false,
    );
  });

  test("requires entity data to match its declared canonical kind", () => {
    expect(
      CanonicalChangeSchema.safeParse({
        type: "entity.create",
        clientRef: "bad",
        seriesRef: "series:new",
        entityType: "character",
        name: "Bad",
        data: {
          description: "room",
          zones: [],
          lighting: "dark",
          era: "now",
          restrictions: [],
          visualRules: [],
        },
      }).success,
    ).toBe(false);
  });

  test("bounds operation counts and rejects duplicate local references", () => {
    const operation = { type: "series.create" as const, clientRef: "same", name: "One" };
    expect(
      ProposalPayloadSchema.safeParse({ schemaVersion: 1, operations: [operation, operation] })
        .success,
    ).toBe(false);
    expect(ProposalPayloadSchema.safeParse({ schemaVersion: 1, operations: [] }).success).toBe(
      false,
    );
  });

  test("requires episode context to name its series", () => {
    expect(
      CopilotContextSchema.safeParse({
        workspaceId: ids.workspace,
        episodePlanId: ids.proposal,
        fingerprint: fp,
      }).success,
    ).toBe(false);
  });

  test("requires the exact canonical StoryState shape for episode plans", () => {
    expect(
      StoryStateInputSchema.safeParse({
        summary: "Legacy weaker shape",
        unresolvedThreads: [],
      }).success,
    ).toBe(false);
    const canonicalState = {
      currentEpisode: 2,
      characters: [
        {
          id: "character-1",
          name: "Vera",
          location: "location-1",
          state: "searching",
          relationships: [{ character: "character-2", trust: 0.5 }],
        },
      ],
      inventory: ["key"],
      facts: ["The door moved"],
      goals: ["Find the door"],
      secretsKnown: [],
      secretsUnknown: ["Who built it"],
      openQuestions: [],
      pastDecisions: [],
      pendingConsequences: [],
      canon: ["The city changes nightly"],
    };
    expect(StoryStateInputSchema.safeParse(canonicalState).success).toBe(true);
    expect(
      EpisodePlanInputSchema.safeParse({
        hook: "Hook",
        dramaticGoal: "Goal",
        beats: ["Beat"],
        targetDuration: "60s",
        characterIds: [],
        locationIds: [],
        propIds: [],
        reveals: [],
        requiredContinuity: [],
        closing: "Close",
        cliffhanger: "Cliff",
        audienceQuestion: null,
        proposedStoryStateAfter: canonicalState,
      }).success,
    ).toBe(true);
  });

  test("requires an exact base only when replacing scenes on an existing plan", () => {
    const scene = {
      purpose: "Reveal",
      locationId: ids.proposal,
      characterIds: [],
      propIds: [],
      action: "Vera opens her hand.",
      dialogue: "The key.",
      estimatedDuration: "10s",
      entryContinuity: "Empty hand",
      exitContinuity: "Key in hand",
      shots: [],
    };
    expect(
      CanonicalChangeSchema.safeParse({
        type: "scene_set.replace_with_revision",
        planId: ids.proposal,
        scenes: [scene],
      }).success,
    ).toBe(false);
    expect(
      CanonicalChangeSchema.safeParse({
        type: "scene_set.replace_with_revision",
        planId: ids.proposal,
        scenes: [scene],
        base: {
          resourceType: "episode_plan",
          resourceId: ids.proposal,
          revisionId: ids.revision,
          version: 1,
          fingerprint: fp,
        },
      }).success,
    ).toBe(true);
    expect(
      CanonicalChangeSchema.safeParse({
        type: "scene_set.replace_with_revision",
        planRef: "plan:new",
        scenes: [scene],
      }).success,
    ).toBe(true);
  });

  test("binds revision contract to content, base and diff fingerprints", () => {
    const payload = {
      schemaVersion: 1 as const,
      operations: [{ type: "series.create" as const, clientRef: "series:new", name: "City" }],
    };
    const contentFingerprint = createContentFingerprint(payload);
    const baseFingerprint = createBaseFingerprint([]);
    const diff = [
      {
        ordinal: 0,
        resourceType: "series" as const,
        clientRef: "series:new",
        operation: "create" as const,
        fieldPath: "",
        after: { name: "City" },
        dependencies: [],
      },
    ];
    const diffFingerprint = createDiffFingerprint(diff);
    const exact = createRevisionFingerprint({
      proposalId: ids.proposal,
      revisionId: ids.revision,
      revisionNumber: 1,
      contentFingerprint,
      baseFingerprint,
      diffFingerprint,
    });
    expect(
      ProposalRevisionSchema.parse({
        id: ids.revision,
        proposalId: ids.proposal,
        revisionNumber: 1,
        schemaVersion: 1,
        payload,
        canonicalBases: [],
        diff,
        contentFingerprint,
        baseFingerprint,
        diffFingerprint,
        fingerprint: exact,
        validationStatus: "pending",
        createdByUserId: ids.user,
        createdAt: new Date(),
      }).fingerprint,
    ).toBe(exact);
  });
});

describe("cost and safe error contracts", () => {
  test("a quote targets exactly one inference message or proposal revision", () => {
    const common = {
      id: ids.proposal,
      workspaceId: ids.workspace,
      actorUserId: ids.user,
      approvalId: null,
      scope: {
        kind: "inference",
        provider: "openai",
        model: "model",
        purpose: "copilot.answer",
        units: 1,
        targetRefs: [],
        executionDependency: "independent",
      },
      scopeFingerprint: fp,
      quoteFingerprint: fp,
      currency: "USD",
      maximumAmount: "0.010000",
      credits: 1,
      quotaFingerprint: fp,
      status: "estimated",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    expect(
      CostQuoteSchema.safeParse({ ...common, revisionId: ids.revision, messageId: ids.user })
        .success,
    ).toBe(false);
    expect(
      CostQuoteSchema.safeParse({ ...common, revisionId: null, messageId: ids.user }).success,
    ).toBe(true);
  });

  test("maps missing and foreign resources to the same non-enumerating response", () => {
    const missing = toSafeCopilotError(resourceNotFound("missing"), ids.proposal);
    const foreign = toSafeCopilotError(resourceNotFound("foreign workspace"), ids.proposal);
    expect(missing).toEqual(foreign);
    expect(JSON.stringify(missing)).not.toContain("foreign");
  });

  test("does not expose unknown internal errors", () => {
    const safe = toSafeCopilotError(new Error("OPENAI_API_KEY=secret"), ids.proposal);
    expect(safe.status).toBe(503);
    expect(JSON.stringify(safe)).not.toContain("secret");
    expect(new CopilotError("stale_draft").retryable).toBe(false);
  });
});
