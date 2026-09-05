import { describe, expect, test } from "bun:test";
import {
  COST_STATES,
  InvalidStateTransitionError,
  PROPOSAL_STATES,
  canTransitionCost,
  canTransitionProposal,
  isSafeProposalState,
  isTerminalProposalState,
  transitionCost,
  transitionProposal,
} from "./state";

describe("proposal state machine", () => {
  test("supports the successful explicit-approval path", () => {
    let state = transitionProposal("collecting_context", "preparing_draft");
    state = transitionProposal(state, "ready_for_review");
    state = transitionProposal(state, "awaiting_approval");
    state = transitionProposal(state, "applying");
    expect(transitionProposal(state, "applied")).toBe("applied");
  });

  test("terminal outcomes cannot reopen", () => {
    for (const state of ["applied", "rejected", "discarded"] as const) {
      expect(isTerminalProposalState(state)).toBe(true);
      for (const candidate of PROPOSAL_STATES)
        expect(canTransitionProposal(state, candidate)).toBe(false);
    }
  });

  test("editing returns review states to a new draft but never authorizes application", () => {
    expect(transitionProposal("awaiting_approval", "preparing_draft")).toBe("preparing_draft");
    expect(canTransitionProposal("ready_for_review", "applying")).toBe(false);
    expect(() => transitionProposal("ready_for_review", "applying")).toThrow(
      InvalidStateTransitionError,
    );
  });

  test("recoverable errors may return only to safe states", () => {
    for (const state of PROPOSAL_STATES) {
      expect(canTransitionProposal("recoverable_error", state)).toBe(isSafeProposalState(state));
    }
    expect(isSafeProposalState("applying")).toBe(false);
  });
});

describe("cost state machine", () => {
  test("requires confirmation before start", () => {
    expect(canTransitionCost("estimated", "started")).toBe(false);
    expect(transitionCost(transitionCost("estimated", "confirmed"), "started")).toBe("started");
  });

  test("expiry and invalidation are terminal", () => {
    for (const state of ["expired", "invalidated", "started"] as const) {
      for (const candidate of COST_STATES) expect(canTransitionCost(state, candidate)).toBe(false);
    }
  });
});
