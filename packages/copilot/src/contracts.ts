import { z } from "zod";
import { COST_STATES, PROPOSAL_STATES } from "./state";

export const COPILOT_LIMITS = {
  title: 160,
  message: 20_000,
  shortText: 500,
  longText: 10_000,
  listItems: 200,
  operations: 100,
  targets: 100,
  findings: 500,
  references: 200,
} as const;

const boundedText = (max: number = COPILOT_LIMITS.longText) => z.string().trim().min(1).max(max);
const id = z.string().uuid();
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);

export const CopilotResourceTypeSchema = z.enum([
  "series",
  "bible",
  "character",
  "location",
  "prop",
  "episode_plan",
  "scene",
  "shot",
  "story_state",
]);
export type CopilotResourceType = z.infer<typeof CopilotResourceTypeSchema>;

export const EntityTypeSchema = z.enum(["character", "location", "prop"]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const CopilotResourceRefSchema = z.object({
  type: CopilotResourceTypeSchema,
  id,
  label: boundedText(COPILOT_LIMITS.shortText).optional(),
  href: z.string().startsWith("/").max(2_000).optional(),
});
export type CopilotResourceRef = z.infer<typeof CopilotResourceRefSchema>;

export const CanonicalBaseSchema = z.object({
  resourceType: CopilotResourceTypeSchema,
  resourceId: id,
  revisionId: id.nullable().optional(),
  version: z.number().int().positive().nullable().optional(),
  fingerprint,
});
export type CanonicalBase = z.infer<typeof CanonicalBaseSchema>;

export const CopilotContextSchema = z
  .object({
    workspaceId: id,
    seriesId: id.optional(),
    episodePlanId: id.optional(),
    episodeNumber: z.number().int().positive().optional(),
    resource: CopilotResourceRefSchema.pick({ type: true, id: true }).optional(),
    fingerprint,
  })
  .superRefine((context, issue) => {
    if (context.episodePlanId && !context.seriesId) {
      issue.addIssue({
        code: "custom",
        path: ["seriesId"],
        message: "Episode context requires a series",
      });
    }
  });
export type CopilotContext = z.infer<typeof CopilotContextSchema>;

export const MessageClassificationSchema = z.enum([
  "query",
  "proposal",
  "canonical_mutation",
  "paid_job",
  "mixed",
]);
export type MessageClassification = z.infer<typeof MessageClassificationSchema>;

export const IntentPartSchema = z.object({
  classification: z.enum(["query", "proposal", "canonical_mutation", "paid_job"]),
  text: boundedText(COPILOT_LIMITS.message),
  requiresProvider: z.boolean(),
  unsupportedResource: z.string().max(COPILOT_LIMITS.shortText).optional(),
});
export type IntentPart = z.infer<typeof IntentPartSchema>;

const stringList = z.array(boundedText(COPILOT_LIMITS.shortText)).max(COPILOT_LIMITS.listItems);

export const BibleInputSchema = z.object({
  title: boundedText(),
  premise: boundedText(),
  genre: boundedText(COPILOT_LIMITS.shortText),
  tone: boundedText(COPILOT_LIMITS.shortText),
  audience: boundedText(COPILOT_LIMITS.shortText),
  format: boundedText(COPILOT_LIMITS.shortText),
  language: boundedText(COPILOT_LIMITS.shortText),
  episodeDuration: boundedText(COPILOT_LIMITS.shortText),
  narrativeRules: stringList,
  visualStyle: boundedText(),
  canon: stringList,
  prohibitions: stringList,
  description: boundedText(),
});

export const CharacterInputSchema = z.object({
  role: boundedText(COPILOT_LIMITS.shortText),
  apparentAge: boundedText(COPILOT_LIMITS.shortText),
  appearance: boundedText(),
  distinctiveTraits: stringList,
  wardrobe: boundedText(),
  personality: boundedText(),
  voice: boundedText(),
  state: boundedText(),
  visualRules: stringList,
});

export const LocationInputSchema = z.object({
  description: boundedText(),
  zones: stringList,
  lighting: boundedText(),
  era: boundedText(COPILOT_LIMITS.shortText),
  restrictions: stringList,
  visualRules: stringList,
});

export const PropInputSchema = z.object({
  description: boundedText(),
  material: boundedText(COPILOT_LIMITS.shortText),
  scale: boundedText(COPILOT_LIMITS.shortText),
  state: boundedText(),
  owner: boundedText(COPILOT_LIMITS.shortText),
  narrativeRelevance: boundedText(),
});

export const EntityDataSchema = z.union([
  CharacterInputSchema,
  LocationInputSchema,
  PropInputSchema,
]);

export const StoryStateInputSchema = z
  .object({
    currentEpisode: z.number().int().min(1),
    characters: z
      .array(
        z.object({
          id: boundedText(COPILOT_LIMITS.shortText),
          name: boundedText(COPILOT_LIMITS.shortText),
          location: z.string().max(COPILOT_LIMITS.shortText),
          state: z.string().max(COPILOT_LIMITS.longText),
          relationships: z
            .array(
              z.object({
                character: boundedText(COPILOT_LIMITS.shortText),
                trust: z.number(),
              }),
            )
            .max(COPILOT_LIMITS.references),
        }),
      )
      .max(COPILOT_LIMITS.listItems),
    inventory: stringList,
    facts: stringList,
    goals: stringList,
    secretsKnown: stringList,
    secretsUnknown: stringList,
    openQuestions: stringList,
    pastDecisions: stringList,
    pendingConsequences: stringList,
    canon: stringList,
  })
  .strict();

export const EpisodePlanInputSchema = z.object({
  hook: boundedText(),
  dramaticGoal: boundedText(),
  beats: stringList,
  targetDuration: boundedText(COPILOT_LIMITS.shortText),
  characterIds: z.array(id).max(COPILOT_LIMITS.listItems),
  locationIds: z.array(id).max(COPILOT_LIMITS.listItems),
  propIds: z.array(id).max(COPILOT_LIMITS.listItems),
  reveals: stringList,
  requiredContinuity: stringList,
  closing: boundedText(),
  cliffhanger: boundedText(),
  audienceQuestion: z.string().trim().max(COPILOT_LIMITS.longText).nullable(),
  proposedStoryStateAfter: StoryStateInputSchema,
});

export const ShotInputSchema = z.object({
  type: boundedText(COPILOT_LIMITS.shortText),
  subject: boundedText(),
  action: boundedText(),
  composition: boundedText(),
  camera: boundedText(COPILOT_LIMITS.shortText),
  lens: boundedText(COPILOT_LIMITS.shortText),
  lighting: boundedText(),
  emotion: boundedText(COPILOT_LIMITS.shortText),
  requiredReferences: stringList,
  imagePrompt: boundedText(),
  videoPrompt: boundedText(),
  continuityConstraints: stringList,
});

export const SceneInputSchema = z.object({
  purpose: boundedText(),
  locationId: id,
  characterIds: z.array(id).max(COPILOT_LIMITS.listItems),
  propIds: z.array(id).max(COPILOT_LIMITS.listItems),
  action: boundedText(),
  dialogue: z.string().max(COPILOT_LIMITS.longText),
  estimatedDuration: boundedText(COPILOT_LIMITS.shortText),
  entryContinuity: boundedText(),
  exitContinuity: boundedText(),
  shots: z.array(ShotInputSchema).max(COPILOT_LIMITS.listItems).default([]),
});

const clientRef = z.string().trim().min(1).max(200);
const targetId = id;

const EntityCreateChangeSchema = z
  .object({
    type: z.literal("entity.create"),
    clientRef,
    seriesId: id.optional(),
    seriesRef: clientRef.optional(),
    entityType: EntityTypeSchema,
    name: boundedText(),
    data: EntityDataSchema,
  })
  .superRefine((change, issue) => {
    if (Boolean(change.seriesId) === Boolean(change.seriesRef)) {
      issue.addIssue({
        code: "custom",
        path: ["seriesId"],
        message: "Exactly one of seriesId or seriesRef is required",
      });
    }
    const schema =
      change.entityType === "character"
        ? CharacterInputSchema
        : change.entityType === "location"
          ? LocationInputSchema
          : PropInputSchema;
    if (!schema.safeParse(change.data).success) {
      issue.addIssue({
        code: "custom",
        path: ["data"],
        message: `Data does not match ${change.entityType}`,
      });
    }
  });

const EntityReviseChangeSchema = z
  .object({
    type: z.literal("entity.revise"),
    targetId,
    entityType: EntityTypeSchema,
    name: boundedText().optional(),
    data: EntityDataSchema,
    base: CanonicalBaseSchema,
  })
  .superRefine((change, issue) => {
    const schema =
      change.entityType === "character"
        ? CharacterInputSchema
        : change.entityType === "location"
          ? LocationInputSchema
          : PropInputSchema;
    if (!schema.safeParse(change.data).success) {
      issue.addIssue({
        code: "custom",
        path: ["data"],
        message: `Data does not match ${change.entityType}`,
      });
    }
  });

export const CanonicalChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("series.create"),
    clientRef,
    name: boundedText(),
    slug: z.string().trim().min(1).max(80).optional(),
  }),
  z.object({
    type: z.literal("series.rename"),
    targetId,
    name: boundedText(),
    base: CanonicalBaseSchema,
  }),
  z.object({ type: z.literal("series.archive"), targetId, base: CanonicalBaseSchema }),
  z
    .object({
      type: z.literal("bible.append"),
      seriesId: id.optional(),
      seriesRef: clientRef.optional(),
      data: BibleInputSchema,
      base: CanonicalBaseSchema.optional(),
    })
    .refine((change) => Boolean(change.seriesId) !== Boolean(change.seriesRef), {
      message: "Exactly one of seriesId or seriesRef is required",
    }),
  EntityCreateChangeSchema,
  EntityReviseChangeSchema,
  z.object({
    type: z.literal("entity.archive"),
    targetId,
    entityType: EntityTypeSchema,
    base: CanonicalBaseSchema,
  }),
  z.object({
    type: z.literal("episode_plan.append"),
    clientRef,
    seriesId: id,
    episodeNumber: z.number().int().positive(),
    data: EpisodePlanInputSchema,
    base: CanonicalBaseSchema.optional(),
  }),
  z
    .object({
      type: z.literal("scene_set.replace_with_revision"),
      planRef: clientRef.optional(),
      planId: id.optional(),
      scenes: z.array(SceneInputSchema).min(1).max(COPILOT_LIMITS.listItems),
      base: CanonicalBaseSchema.optional(),
    })
    .superRefine((change, issue) => {
      if (Boolean(change.planId) === Boolean(change.planRef)) {
        issue.addIssue({
          code: "custom",
          path: ["planId"],
          message: "Exactly one of planId or planRef is required",
        });
      }
      if (change.planId && !change.base) {
        issue.addIssue({
          code: "custom",
          path: ["base"],
          message: "Replacing scenes on an existing plan requires its exact canonical base",
        });
      }
      if (change.planRef && change.base) {
        issue.addIssue({
          code: "custom",
          path: ["base"],
          message: "A newly proposed plan cannot declare an existing canonical base",
        });
      }
    }),
  z.object({
    type: z.literal("paid_job.request"),
    clientRef,
    jobType: boundedText(COPILOT_LIMITS.shortText),
    targetRefs: z.array(clientRef).min(1).max(COPILOT_LIMITS.targets),
    executionDependency: z.enum(["independent", "requires_application_receipt"]),
    parameters: z.record(z.string().max(200), z.unknown()).default({}),
  }),
]);
export type CanonicalChange = z.infer<typeof CanonicalChangeSchema>;

export const ProposalPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    operations: z.array(CanonicalChangeSchema).min(1).max(COPILOT_LIMITS.operations),
  })
  .superRefine((payload, issue) => {
    const refs = new Set<string>();
    for (const [index, operation] of payload.operations.entries()) {
      if ("clientRef" in operation) {
        if (refs.has(operation.clientRef)) {
          issue.addIssue({
            code: "custom",
            path: ["operations", index, "clientRef"],
            message: "clientRef must be unique within a revision",
          });
        }
        refs.add(operation.clientRef);
      }
    }
  });
export type ProposalPayload = z.infer<typeof ProposalPayloadSchema>;

export const DiffItemSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  resourceType: CopilotResourceTypeSchema,
  resourceId: id.optional(),
  clientRef: clientRef.optional(),
  operation: z.enum(["create", "update", "archive", "request"]),
  fieldPath: z.string().max(500),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  dependencies: z.array(clientRef).max(COPILOT_LIMITS.targets).default([]),
});
export type DiffItem = z.infer<typeof DiffItemSchema>;

export const ValidationFindingSchema = z.object({
  ordinal: z.number().int().nonnegative(),
  severity: z.enum(["warning", "blocking"]),
  code: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .max(100),
  resourceType: CopilotResourceTypeSchema.optional(),
  resourceId: id.optional(),
  clientRef: clientRef.optional(),
  fieldPath: z.string().max(500).optional(),
  message: boundedText(2_000),
  remediation: z.string().trim().max(2_000).optional(),
});
export type ValidationFinding = z.infer<typeof ValidationFindingSchema>;

export const ProposalRevisionSchema = z.object({
  id,
  proposalId: id,
  revisionNumber: z.number().int().positive(),
  schemaVersion: z.literal(1),
  payload: ProposalPayloadSchema,
  canonicalBases: z.array(CanonicalBaseSchema).max(COPILOT_LIMITS.targets),
  diff: z.array(DiffItemSchema).max(COPILOT_LIMITS.findings),
  contentFingerprint: fingerprint,
  baseFingerprint: fingerprint,
  diffFingerprint: fingerprint,
  fingerprint,
  validationStatus: z.enum(["pending", "valid", "valid_with_warnings", "invalid", "stale"]),
  createdByUserId: id,
  createdAt: z.coerce.date(),
});
export type ProposalRevision = z.infer<typeof ProposalRevisionSchema>;

export const ProposalStateSchema = z.enum(PROPOSAL_STATES);
export const ProposalIntentSchema = z.enum(["canonical_mutation", "paid_job", "mixed"]);
export const ProposalSchema = z.object({
  id,
  conversationId: id,
  workspaceId: id,
  contextSnapshotId: id,
  createdByUserId: id,
  intent: ProposalIntentSchema,
  status: ProposalStateSchema,
  currentRevisionId: id.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const DecisionSchema = z.object({
  id,
  revisionId: id,
  validationRunId: id,
  workspaceId: id,
  actorUserId: id,
  fingerprint,
  diffFingerprint: fingerprint,
  baseFingerprint: fingerprint,
  kind: z.enum(["approved", "rejected", "discarded"]),
  createdAt: z.coerce.date(),
});
export type Decision = z.infer<typeof DecisionSchema>;

export const ApplicationReceiptSchema = z.object({
  id,
  applicationId: id,
  approvalId: id,
  revisionId: id,
  workspaceId: id,
  actorUserId: id,
  fingerprint,
  correlationId: id,
  results: z.array(CopilotResourceRefSchema).max(COPILOT_LIMITS.references),
  committedAt: z.coerce.date(),
});
export type ApplicationReceipt = z.infer<typeof ApplicationReceiptSchema>;

export const CostScopeSchema = z.object({
  kind: z.enum(["inference", "proposal_job"]),
  provider: boundedText(COPILOT_LIMITS.shortText),
  model: boundedText(COPILOT_LIMITS.shortText),
  purpose: boundedText(COPILOT_LIMITS.shortText),
  units: z.number().int().positive(),
  targetRefs: z.array(clientRef).max(COPILOT_LIMITS.targets),
  executionDependency: z.enum(["independent", "requires_application_receipt"]),
});
export type CostScope = z.infer<typeof CostScopeSchema>;

export const CostQuoteSchema = z
  .object({
    id,
    workspaceId: id,
    actorUserId: id,
    revisionId: id.nullable(),
    messageId: id.nullable(),
    approvalId: id.nullable(),
    scope: CostScopeSchema,
    scopeFingerprint: fingerprint,
    quoteFingerprint: fingerprint,
    currency: z.string().regex(/^[A-Z]{3}$/),
    maximumAmount: z.string().regex(/^\d+(\.\d{1,6})?$/),
    credits: z.number().int().nonnegative(),
    quotaFingerprint: fingerprint,
    status: z.enum(COST_STATES),
    expiresAt: z.coerce.date(),
    createdAt: z.coerce.date(),
  })
  .superRefine((quote, issue) => {
    if ((quote.revisionId === null) === (quote.messageId === null)) {
      issue.addIssue({
        code: "custom",
        path: ["revisionId"],
        message: "Quote must target one revision or one message",
      });
    }
  });
export type CostQuote = z.infer<typeof CostQuoteSchema>;

export const CostConfirmationSchema = z.object({
  id,
  quoteId: id,
  workspaceId: id,
  actorUserId: id,
  quoteFingerprint: fingerprint,
  scopeFingerprint: fingerprint,
  quotaFingerprint: fingerprint,
  createdAt: z.coerce.date(),
});
export type CostConfirmation = z.infer<typeof CostConfirmationSchema>;

export const GroundedSourceSchema = z.object({
  resource: CopilotResourceRefSchema,
  fieldPaths: z.array(z.string().max(500)).min(1).max(100),
  baseFingerprint: fingerprint,
});
export type GroundedSource = z.infer<typeof GroundedSourceSchema>;

export const GroundedAnswerSchema = z.object({
  kind: z.literal("grounded_answer"),
  text: boundedText(COPILOT_LIMITS.message),
  sources: z.array(GroundedSourceSchema).min(1).max(COPILOT_LIMITS.references),
  deterministic: z.boolean(),
});
export type GroundedAnswer = z.infer<typeof GroundedAnswerSchema>;
