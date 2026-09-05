import { describe, expect, test } from "bun:test";
import {
  decideProposalRevision,
  type ExactProposalRevision,
  type ExactValidationRun,
  type ProposalDecision,
  type ProposalDecisionRepository,
  type ProposalDecisionTransaction,
} from "./proposals";
import { buildProposalDiff, validateProposalChangeSet } from "./validation";

const revision: ExactProposalRevision = {
  id: "revision-1",
  proposalId: "proposal-1",
  workspaceId: "workspace-1",
  fingerprint: "revision-fingerprint",
  diffFingerprint: "diff-fingerprint",
  baseFingerprint: "base-fingerprint",
  diffCount: 1,
};
const validation: ExactValidationRun = {
  id: "validation-1",
  revisionId: revision.id,
  revisionFingerprint: revision.fingerprint,
  baseFingerprint: revision.baseFingerprint,
  status: "valid_with_warnings",
};

function repository(
  options: {
    currentRevisionId?: string;
    existing?: ProposalDecision;
    status?: ExactValidationRun["status"];
  } = {},
) {
  let decision = options.existing;
  const tx: ProposalDecisionTransaction = {
    lockProposal: async () => ({
      currentRevisionId: options.currentRevisionId ?? revision.id,
      status: "awaiting_approval",
    }),
    getRevision: async () => revision,
    getLatestValidation: async () => ({
      ...validation,
      status: options.status ?? validation.status,
    }),
    getDecision: async () => decision ?? null,
    insertDecision: async (input) =>
      (decision = { ...input, id: "decision-1", createdAt: "2026-09-05T10:00:00.000Z" }),
    setProposalStatus: async () => undefined,
  };
  return {
    transaction: async <T>(callback: (inner: ProposalDecisionTransaction) => Promise<T>) =>
      callback(tx),
  } satisfies ProposalDecisionRepository;
}

const command = {
  workspaceId: "workspace-1",
  actorUserId: "user-1",
  proposalId: "proposal-1",
  revisionId: "revision-1",
  validationRunId: "validation-1",
  fingerprint: "revision-fingerprint",
  kind: "approved" as const,
};

describe("proposal decisions", () => {
  test("produces a complete deterministic field diff and actionable missing-context findings", async () => {
    const payload = {
      schemaVersion: 1 as const,
      operations: [
        {
          type: "episode_plan.append" as const,
          clientRef: "plan",
          seriesId: "00000000-0000-4000-8000-000000000001",
          episodeNumber: 1,
          data: {
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
            proposedStoryStateAfter: {
              currentEpisode: 2,
              characters: [],
              inventory: [],
              facts: [],
              goals: [],
              secretsKnown: [],
              secretsUnknown: [],
              openQuestions: [],
              pastDecisions: [],
              pendingConsequences: [],
              canon: [],
            },
          },
        },
      ],
    };
    const diff = await buildProposalDiff(payload);
    expect(diff.map((item) => item.fieldPath)).toContain("operations[0].data");
    expect(diff.map((item) => item.fieldPath)).toContain("operations[0].episodeNumber");
    const validationResult = await validateProposalChangeSet(payload, {
      workspaceId: "workspace-1",
      canonicalBases: [],
      owns: async () => true,
      hasContextResource: async () => false,
    });
    expect(validationResult.status).toBe("invalid");
    expect(validationResult.findings.map((finding) => finding.code)).toEqual([
      "missing_bible",
      "missing_story_state",
    ]);
  });

  test("allows exact approval for valid_with_warnings", async () => {
    const result = await decideProposalRevision(repository(), command);
    expect(result).toMatchObject({ ok: true, replayed: false, decision: { kind: "approved" } });
  });

  test("rejects stale current revision and stale validation", async () => {
    expect(
      await decideProposalRevision(repository({ currentRevisionId: "revision-2" }), command),
    ).toMatchObject({ ok: false, code: "stale" });
    expect(await decideProposalRevision(repository({ status: "stale" }), command)).toMatchObject({
      ok: false,
      code: "not_approvable",
    });
  });

  test("replays only the exact one-use decision", async () => {
    const store = repository();
    const first = await decideProposalRevision(store, command);
    expect(first.ok).toBe(true);
    expect(await decideProposalRevision(store, command)).toMatchObject({
      ok: true,
      replayed: true,
    });
    expect(
      await decideProposalRevision(store, { ...command, actorUserId: "user-2" }),
    ).toMatchObject({ ok: false, code: "conflict" });
  });
});
