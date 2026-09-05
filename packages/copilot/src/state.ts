export const PROPOSAL_STATES = [
  "collecting_context",
  "preparing_draft",
  "needs_information",
  "ready_for_review",
  "awaiting_approval",
  "continuity_conflict",
  "stale_draft",
  "applying",
  "applied",
  "rejected",
  "discarded",
  "recoverable_error",
] as const;

export type ProposalState = (typeof PROPOSAL_STATES)[number];

export const COST_STATES = ["estimated", "confirmed", "started", "expired", "invalidated"] as const;
export type CostState = (typeof COST_STATES)[number];

const TERMINAL_PROPOSAL_STATES = new Set<ProposalState>(["applied", "rejected", "discarded"]);
const SAFE_PROPOSAL_STATES = new Set<ProposalState>([
  "collecting_context",
  "preparing_draft",
  "needs_information",
  "ready_for_review",
  "awaiting_approval",
  "continuity_conflict",
  "stale_draft",
]);

const proposalTransitions: Readonly<Record<ProposalState, ReadonlySet<ProposalState>>> = {
  collecting_context: new Set(["preparing_draft", "needs_information", "recoverable_error"]),
  preparing_draft: new Set(["needs_information", "ready_for_review", "recoverable_error"]),
  needs_information: new Set(["preparing_draft", "discarded", "recoverable_error"]),
  ready_for_review: new Set([
    "preparing_draft",
    "awaiting_approval",
    "continuity_conflict",
    "stale_draft",
    "rejected",
    "discarded",
    "recoverable_error",
  ]),
  awaiting_approval: new Set([
    "preparing_draft",
    "applying",
    "continuity_conflict",
    "stale_draft",
    "rejected",
    "discarded",
    "recoverable_error",
  ]),
  continuity_conflict: new Set(["preparing_draft", "discarded", "recoverable_error"]),
  stale_draft: new Set(["preparing_draft", "discarded", "recoverable_error"]),
  applying: new Set(["applied", "stale_draft", "continuity_conflict", "recoverable_error"]),
  recoverable_error: new Set([
    "collecting_context",
    "preparing_draft",
    "needs_information",
    "ready_for_review",
    "awaiting_approval",
    "continuity_conflict",
    "stale_draft",
  ]),
  applied: new Set(),
  rejected: new Set(),
  discarded: new Set(),
};

const costTransitions: Readonly<Record<CostState, ReadonlySet<CostState>>> = {
  estimated: new Set(["confirmed", "expired", "invalidated"]),
  confirmed: new Set(["started", "expired", "invalidated"]),
  started: new Set(),
  expired: new Set(),
  invalidated: new Set(),
};

export class InvalidStateTransitionError extends Error {
  readonly from: ProposalState | CostState;
  readonly to: ProposalState | CostState;

  constructor(from: ProposalState | CostState, to: ProposalState | CostState) {
    super(`Invalid state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
    this.from = from;
    this.to = to;
  }
}

export function canTransitionProposal(from: ProposalState, to: ProposalState): boolean {
  return proposalTransitions[from].has(to);
}

export function transitionProposal(from: ProposalState, to: ProposalState): ProposalState {
  if (!canTransitionProposal(from, to)) throw new InvalidStateTransitionError(from, to);
  return to;
}

export function isTerminalProposalState(state: ProposalState): boolean {
  return TERMINAL_PROPOSAL_STATES.has(state);
}

export function isSafeProposalState(state: ProposalState): boolean {
  return SAFE_PROPOSAL_STATES.has(state);
}

export function canTransitionCost(from: CostState, to: CostState): boolean {
  return costTransitions[from].has(to);
}

export function transitionCost(from: CostState, to: CostState): CostState {
  if (!canTransitionCost(from, to)) throw new InvalidStateTransitionError(from, to);
  return to;
}
