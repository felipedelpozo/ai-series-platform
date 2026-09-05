export type CopilotRole = "owner" | "editor" | "viewer";

export type CopilotWorkflowState =
  | "collecting_context"
  | "preparing_draft"
  | "ready_for_review"
  | "awaiting_approval"
  | "awaiting_application"
  | "applying"
  | "applied"
  | "needs_information"
  | "continuity_conflict"
  | "stale_draft"
  | "recoverable_error"
  | "rejected"
  | "discarded";

export type CopilotContext = {
  workspaceId: string;
  workspaceName: string;
  role: CopilotRole;
  seriesId?: string;
  seriesName?: string;
  episodePlanId?: string;
  episodeNumber?: number;
  resource?: { type: string; id: string; label?: string };
  fingerprint: string;
};

export type CopilotMessage = {
  id: string;
  sequence: number;
  role: "user" | "assistant" | "system";
  classification: "query" | "proposal" | "canonical_mutation" | "paid_job" | "mixed";
  content: string;
  createdAt: string;
  references?: { label: string; href: string }[];
};

export type CopilotFinding = {
  id: string;
  severity: "warning" | "blocking";
  message: string;
  target?: string;
  fieldPath?: string;
  remediation?: string;
};

export type CopilotDiffItem = {
  id: string;
  operation: "create" | "update" | "archive" | string;
  resourceType: string;
  resourceLabel: string;
  field?: string;
  before?: unknown;
  after?: unknown;
};

export type CopilotQuote = {
  id: string;
  fingerprint: string;
  provider: string;
  model?: string;
  modality: string;
  amount: string;
  currency: string;
  units: string;
  availableQuota: string;
  expiresAt: string;
  scope: CopilotCostScope;
  expired?: boolean;
};

export type CopilotCostScope = {
  kind: string;
  provider: string;
  model: string;
  purpose: string;
  units: number;
  targetRefs: string[];
  executionDependency: "independent" | "requires_application_receipt";
};

export type CopilotEpisodeOption = {
  id: string;
  seriesId: string;
  episodeNumber: number;
  version?: number;
  status?: string;
};

export type CopilotResourceOption = {
  id: string;
  type: string;
  label: string;
  seriesId: string;
  episodePlanId?: string;
};

export type CopilotRevision = {
  id: string;
  proposalId: string;
  revisionNumber: number;
  fingerprint: string;
  payload: unknown;
  diff: CopilotDiffItem[];
  findings: CopilotFinding[];
  validationStatus: "pending" | "valid" | "valid_with_warnings" | "invalid" | "stale";
  validationRunId?: string;
  approvalId?: string;
  decision?: "approved" | "rejected" | "discarded";
  costQuote?: CopilotQuote;
};

export type CopilotReceipt = {
  id: string;
  committedAt: string;
  correlationId?: string;
  links: { kind: string; label: string; href: string }[];
};

export type CopilotTimelineEvent = {
  id: string;
  sequence: number;
  type: string;
  createdAt: string;
};

export type CopilotProposalHistory = {
  id: string;
  status?: string;
  revisions: CopilotRevision[];
};

export type CopilotConversation = {
  id: string;
  title: string;
  status: CopilotWorkflowState;
  stateCause?: string;
  nextAction?: string;
  context: CopilotContext;
  messages: CopilotMessage[];
  revision?: CopilotRevision;
  revisions?: CopilotRevision[];
  receipt?: CopilotReceipt;
  proposals?: CopilotProposalHistory[];
  timeline?: CopilotTimelineEvent[];
  retryable?: boolean;
  updatedAt?: string;
  inferenceQuote?: CopilotQuote;
  pendingMessageId?: string;
};

export type CopilotConversationSummary = Pick<
  CopilotConversation,
  "id" | "title" | "status" | "context" | "updatedAt"
>;

export type CopilotBootstrap = {
  conversations: CopilotConversationSummary[];
  workspaces: { id: string; name: string; role: CopilotRole }[];
  series: { id: string; name: string; workspaceId?: string }[];
};

export class CopilotRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function roleValue(value: unknown): CopilotRole {
  return value === "owner" || value === "editor" || value === "viewer" ? value : "viewer";
}

function stateValue(value: unknown): CopilotWorkflowState {
  const normalized = stringValue(value, "collecting_context") as CopilotWorkflowState;
  return [
    "collecting_context",
    "preparing_draft",
    "ready_for_review",
    "awaiting_approval",
    "awaiting_application",
    "applying",
    "applied",
    "needs_information",
    "continuity_conflict",
    "stale_draft",
    "recoverable_error",
    "rejected",
    "discarded",
  ].includes(normalized)
    ? normalized
    : "collecting_context";
}

function contextValue(value: unknown, fallbackWorkspace?: Record<string, unknown>): CopilotContext {
  const source = record(value);
  const workspace = record(source.workspace);
  return {
    workspaceId: stringValue(source.workspaceId, stringValue(fallbackWorkspace?.id)),
    workspaceName: stringValue(
      source.workspaceName,
      stringValue(workspace.name, stringValue(fallbackWorkspace?.name, "Workspace")),
    ),
    role: roleValue(source.role ?? fallbackWorkspace?.role),
    seriesId: stringValue(source.seriesId) || undefined,
    seriesName: stringValue(source.seriesName) || undefined,
    episodePlanId: stringValue(source.episodePlanId) || undefined,
    episodeNumber: typeof source.episodeNumber === "number" ? source.episodeNumber : undefined,
    resource:
      source.resource && typeof source.resource === "object"
        ? {
            type: stringValue(record(source.resource).type, "resource"),
            id: stringValue(record(source.resource).id),
            label: stringValue(record(source.resource).label) || undefined,
          }
        : undefined,
    fingerprint: stringValue(source.fingerprint, "pending-context"),
  };
}

function messageValue(value: unknown, index: number): CopilotMessage {
  const source = record(value);
  const structuredRefs = record(source.structuredRefs);
  const groundedSources = Array.isArray(structuredRefs.sources) ? structuredRefs.sources : [];
  const referenceValues = Array.isArray(source.references)
    ? source.references
    : groundedSources.map((item) => record(item).resource);
  const refs = referenceValues.length
    ? referenceValues.map(record).flatMap((item) => {
        const href = stringValue(item.href);
        if (!href.startsWith("/")) return [];
        return [{ label: stringValue(item.label, "Open resource"), href }];
      })
    : undefined;
  const classification = stringValue(source.classification, "query");
  return {
    id: stringValue(source.id, `message-${index}`),
    sequence: typeof source.sequence === "number" ? source.sequence : index + 1,
    role:
      source.role === "user" || source.role === "system" || source.role === "assistant"
        ? source.role
        : "assistant",
    classification: ["query", "proposal", "canonical_mutation", "paid_job", "mixed"].includes(
      classification,
    )
      ? (classification as CopilotMessage["classification"])
      : "query",
    content: stringValue(source.content),
    createdAt: stringValue(source.createdAt, new Date(0).toISOString()),
    references: refs,
  };
}

function diffValue(value: unknown, index: number): CopilotDiffItem {
  const source = record(value);
  return {
    id: stringValue(source.id, `diff-${index}`),
    operation: stringValue(source.operation, "update"),
    resourceType: stringValue(source.resourceType ?? source.type, "Resource"),
    resourceLabel: stringValue(source.resourceLabel ?? source.label, "Untitled resource"),
    field: stringValue(source.field ?? source.fieldPath) || undefined,
    before: source.before,
    after: source.after,
  };
}

function findingValue(value: unknown, index: number): CopilotFinding {
  const source = record(value);
  return {
    id: stringValue(source.id, `finding-${index}`),
    severity: source.severity === "blocking" ? "blocking" : "warning",
    message: stringValue(source.message, "Review this validation finding."),
    target: stringValue(source.target) || undefined,
    fieldPath: stringValue(source.fieldPath) || undefined,
    remediation: stringValue(source.remediation) || undefined,
  };
}

export function quoteValue(value: unknown): CopilotQuote | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = record(value);
  const scope = scopeValue(source.scope, source);
  return {
    id: stringValue(source.id ?? source.quoteId),
    fingerprint: stringValue(source.fingerprint ?? source.quoteFingerprint),
    provider: stringValue(source.provider, scope.provider),
    model: stringValue(source.model, scope.model) || undefined,
    modality: stringValue(source.modality ?? source.kind, scope.purpose),
    amount: stringValue(source.amount ?? source.maximumAmount, "—"),
    currency: stringValue(source.currency, "USD"),
    units: stringValue(source.units, String(scope.units)),
    availableQuota: stringValue(source.availableQuota ?? source.quotaAvailable, "Not reported"),
    expiresAt: stringValue(source.expiresAt),
    scope,
    expired: source.expired === true || source.status === "expired",
  };
}

function scopeValue(value: unknown, quote: Record<string, unknown>): CopilotCostScope {
  const scope = record(value);
  const legacyLabel = typeof value === "string" ? value : "";
  const provider = stringValue(scope.provider, stringValue(quote.provider, "Configured provider"));
  const model = stringValue(scope.model, stringValue(quote.model, "default"));
  const purpose = stringValue(
    scope.purpose,
    legacyLabel || stringValue(quote.modality ?? quote.kind, "generation"),
  );
  const rawUnits = scope.units ?? quote.units;
  const units =
    typeof rawUnits === "number" && Number.isSafeInteger(rawUnits) && rawUnits > 0
      ? rawUnits
      : typeof rawUnits === "string" && /^\d+$/.test(rawUnits) && Number(rawUnits) > 0
        ? Number(rawUnits)
        : 1;
  return {
    kind: stringValue(scope.kind, quote.revisionId ? "proposal_job" : "inference"),
    provider,
    model,
    purpose,
    units,
    targetRefs: Array.isArray(scope.targetRefs)
      ? scope.targetRefs.filter((item): item is string => typeof item === "string")
      : [],
    executionDependency:
      scope.executionDependency === "requires_application_receipt"
        ? "requires_application_receipt"
        : "independent",
  };
}

function revisionValue(value: unknown): CopilotRevision | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = record(value);
  const validation = record(source.validation);
  const decision = record(source.decision);
  const approvalId = stringValue(source.approvalId, stringValue(decision.id));
  const decisionKind = stringValue(
    source.decisionKind,
    typeof source.decision === "string" ? source.decision : stringValue(decision.kind),
  );
  return {
    id: stringValue(source.id ?? source.revisionId),
    proposalId: stringValue(source.proposalId),
    revisionNumber:
      typeof source.revisionNumber === "number"
        ? source.revisionNumber
        : typeof source.version === "number"
          ? source.version
          : 1,
    fingerprint: stringValue(source.fingerprint),
    payload: source.payload ?? {},
    diff: (Array.isArray(source.diff) ? source.diff : []).map(diffValue),
    findings: (Array.isArray(source.findings)
      ? source.findings
      : Array.isArray(validation.findings)
        ? validation.findings
        : []
    ).map(findingValue),
    validationStatus: (["pending", "valid", "valid_with_warnings", "invalid", "stale"].includes(
      stringValue(source.validationStatus, stringValue(validation.status, "pending")),
    )
      ? stringValue(source.validationStatus, stringValue(validation.status, "pending"))
      : "pending") as CopilotRevision["validationStatus"],
    validationRunId: stringValue(source.validationRunId, stringValue(validation.id)) || undefined,
    approvalId: approvalId || undefined,
    decision: ["approved", "rejected", "discarded"].includes(decisionKind)
      ? (decisionKind as CopilotRevision["decision"])
      : undefined,
    costQuote: quoteValue(source.costQuote ?? source.quote),
  };
}

function receiptValue(value: unknown, linksValue?: unknown): CopilotReceipt | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = record(value);
  const links = Array.isArray(source.links)
    ? source.links
    : Array.isArray(linksValue)
      ? linksValue
      : [];
  return {
    id: stringValue(source.id),
    committedAt: stringValue(source.committedAt ?? source.createdAt),
    correlationId: stringValue(source.correlationId) || undefined,
    links: links.map(record).map((item) => ({
      kind: stringValue(item.kind, "resource"),
      label: stringValue(item.label, "Open resource"),
      href: stringValue(item.href, "/series"),
    })),
  };
}

function timelineValue(value: unknown, index: number): CopilotTimelineEvent {
  const source = record(value);
  return {
    id: stringValue(source.id, `event-${index}`),
    sequence: typeof source.sequence === "number" ? source.sequence : index + 1,
    type: stringValue(source.type, "conversation.event"),
    createdAt: stringValue(source.createdAt, new Date(0).toISOString()),
  };
}

function proposalHistoryValue(value: unknown): CopilotProposalHistory | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = record(value);
  const id = stringValue(source.id ?? source.proposalId);
  if (!id) return undefined;
  return {
    id,
    status: stringValue(source.status) || undefined,
    revisions: (Array.isArray(source.revisions) ? source.revisions : [])
      .map((revision) => revisionValue({ ...record(revision), proposalId: id }))
      .filter((revision): revision is CopilotRevision => Boolean(revision)),
  };
}

export function conversationValue(
  value: unknown,
  fallback?: Partial<CopilotConversation>,
): CopilotConversation {
  const source = record(value);
  const conversation = record(source.conversation);
  const merged = Object.keys(conversation).length > 0 ? { ...source, ...conversation } : source;
  const revision =
    revisionValue(
      merged.revision ?? merged.currentRevision ?? source.revision ?? source.proposalRevision,
    ) ?? fallback?.revision;
  const proposal = record(merged.proposal);
  const history = record(merged.history ?? source.history);
  if (revision && !revision.proposalId) revision.proposalId = stringValue(proposal.id);
  const receipt =
    receiptValue(merged.receipt ?? source.receipt, merged.links ?? source.links) ??
    fallback?.receipt;
  const reportedStatus = stateValue(
    merged.workflowState ?? merged.state ?? merged.status ?? proposal.status ?? fallback?.status,
  );
  const status = receipt
    ? "applied"
    : revision?.decision === "approved" && reportedStatus === "awaiting_approval"
      ? "awaiting_application"
      : reportedStatus;
  return {
    id: stringValue(merged.id ?? merged.conversationId, fallback?.id),
    title: stringValue(merged.title, fallback?.title ?? "Creative conversation"),
    status,
    stateCause:
      stringValue(merged.stateCause ?? merged.reason, fallback?.stateCause) ||
      (status === "awaiting_application" ? "Exact revision approved" : undefined),
    nextAction:
      stringValue(merged.nextAction, fallback?.nextAction) ||
      (status === "awaiting_application" ? "Apply the approved revision." : undefined),
    context: contextValue(merged.context ?? merged.activeContext, record(fallback?.context)),
    messages: (Array.isArray(merged.messages) ? merged.messages : (fallback?.messages ?? [])).map(
      messageValue,
    ),
    revision,
    revisions: (Array.isArray(merged.revisions) ? merged.revisions : [])
      .map(revisionValue)
      .filter((item): item is CopilotRevision => Boolean(item)),
    receipt,
    proposals: (Array.isArray(history.proposals) ? history.proposals : [])
      .map(proposalHistoryValue)
      .filter((item): item is CopilotProposalHistory => Boolean(item)),
    timeline: (Array.isArray(merged.timeline) ? merged.timeline : []).map(timelineValue),
    retryable: merged.retryable === true,
    updatedAt: stringValue(merged.updatedAt, fallback?.updatedAt) || undefined,
    inferenceQuote:
      quoteValue(merged.inferenceQuote ?? merged.messageQuote ?? source.quote) ??
      fallback?.inferenceQuote,
    pendingMessageId:
      stringValue(merged.pendingMessageId ?? record(merged.pendingMessage).id) ||
      fallback?.pendingMessageId,
  };
}

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const source = record(payload);
    const nestedError = record(source.error);
    throw new CopilotRequestError(
      stringValue(
        nestedError.message ?? source.error ?? source.message ?? source.reason,
        "The request could not be completed.",
      ),
      response.status,
      payload,
    );
  }
  return payload;
}

export async function copilotRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  return parseResponse(response);
}

export async function loadCopilotBootstrap(): Promise<CopilotBootstrap> {
  const [conversationResult, meResult, seriesResult] = await Promise.allSettled([
    copilotRequest("/api/copilot/conversations"),
    copilotRequest("/api/me"),
    copilotRequest("/api/series"),
  ]);
  if (conversationResult.status === "rejected") throw conversationResult.reason;

  const conversationsPayload = record(conversationResult.value);
  const mePayload = meResult.status === "fulfilled" ? record(meResult.value) : {};
  const workspaces = Array.isArray(mePayload.workspaces) ? mePayload.workspaces : [];
  const defaultAccess = record(workspaces[0]);
  const defaultWorkspace = { ...record(defaultAccess.workspace), role: defaultAccess.role };

  return {
    conversations: (Array.isArray(conversationsPayload.conversations)
      ? conversationsPayload.conversations
      : []
    ).map((item) => {
      const normalized = conversationValue(item, {
        context: contextValue({}, defaultWorkspace),
      });
      return {
        id: normalized.id,
        title: normalized.title,
        status: normalized.status,
        context: normalized.context,
        updatedAt: normalized.updatedAt,
      };
    }),
    workspaces: workspaces.map(record).map((access) => {
      const workspace = record(access.workspace);
      return {
        id: stringValue(workspace.id),
        name: stringValue(workspace.name, "Workspace"),
        role: roleValue(access.role),
      };
    }),
    series:
      seriesResult.status === "fulfilled" && Array.isArray(record(seriesResult.value).series)
        ? (record(seriesResult.value).series as unknown[]).map(record).map((series) => ({
            id: stringValue(series.id),
            name: stringValue(series.name, "Untitled series"),
            workspaceId: stringValue(series.workspaceId) || undefined,
          }))
        : [],
  };
}

export async function loadConversation(id: string, fallback?: Partial<CopilotConversation>) {
  const path = `/api/copilot/conversations/${encodeURIComponent(id)}`;
  let payload = await copilotRequest(`${path}?limit=${CONVERSATION_PAGE_LIMIT}`);
  let conversation = conversationPageValue(payload, fallback);
  const seenCursors = new Set<string>();

  for (let page = 1; page < MAX_CONVERSATION_PAGES; page += 1) {
    const cursor = nextCursorValue(payload);
    if (!cursor) return conversation;
    if (seenCursors.has(cursor)) {
      throw new Error("Conversation history returned a repeated cursor.");
    }
    seenCursors.add(cursor);
    payload = await copilotRequest(
      `${path}?limit=${CONVERSATION_PAGE_LIMIT}&cursor=${encodeURIComponent(cursor)}`,
    );
    conversation = mergeConversationPages(conversation, conversationPageValue(payload));
  }

  if (nextCursorValue(payload)) {
    throw new Error("Conversation history exceeds the safe recovery limit.");
  }
  return conversation;
}

const CONVERSATION_PAGE_LIMIT = 50;
const MAX_CONVERSATION_PAGES = 100;

function conversationPageValue(
  value: unknown,
  fallback?: Partial<CopilotConversation>,
): CopilotConversation {
  const source = record(value);
  const history = record(source.history);
  const messages = Array.isArray(history.messages) ? history.messages : source.messages;
  const normalized = conversationValue({ ...source, messages }, fallback);
  const historyRevisions = (normalized.proposals ?? []).flatMap((proposal) => proposal.revisions);
  return {
    ...normalized,
    revisions: mergeById(normalized.revisions ?? [], historyRevisions, revisionIdentity).sort(
      compareRevisions,
    ),
  };
}

function nextCursorValue(value: unknown) {
  const source = record(value);
  return (
    stringValue(source.nextCursor, stringValue(record(source.history).nextCursor)) || undefined
  );
}

function mergeConversationPages(
  first: CopilotConversation,
  next: CopilotConversation,
): CopilotConversation {
  return {
    ...first,
    messages: mergeById(first.messages, next.messages, (message) => message.id).sort(
      (left, right) => left.sequence - right.sequence,
    ),
    revisions: mergeById(first.revisions ?? [], next.revisions ?? [], revisionIdentity).sort(
      compareRevisions,
    ),
    proposals: mergeProposalPages(first.proposals ?? [], next.proposals ?? []),
    timeline: mergeById(first.timeline ?? [], next.timeline ?? [], (event) => event.id).sort(
      (left, right) => left.sequence - right.sequence,
    ),
  };
}

function mergeProposalPages(
  first: CopilotProposalHistory[],
  next: CopilotProposalHistory[],
): CopilotProposalHistory[] {
  const proposals = new Map(first.map((proposal) => [proposal.id, proposal]));
  for (const proposal of next) {
    const previous = proposals.get(proposal.id);
    proposals.set(
      proposal.id,
      previous
        ? {
            ...previous,
            ...proposal,
            revisions: mergeById(previous.revisions, proposal.revisions, revisionIdentity).sort(
              compareRevisions,
            ),
          }
        : proposal,
    );
  }
  return [...proposals.values()];
}

function mergeById<T>(first: T[], next: T[], identity: (value: T) => string): T[] {
  const values = new Map(first.map((value) => [identity(value), value]));
  for (const value of next) {
    const key = identity(value);
    if (!values.has(key)) values.set(key, value);
  }
  return [...values.values()];
}

function revisionIdentity(revision: CopilotRevision) {
  return revision.id || `${revision.proposalId}:${revision.revisionNumber}`;
}

function compareRevisions(left: CopilotRevision, right: CopilotRevision) {
  return left.proposalId === right.proposalId
    ? right.revisionNumber - left.revisionNumber
    : left.proposalId.localeCompare(right.proposalId);
}

export async function loadCopilotSeriesContextOptions(seriesId: string): Promise<{
  episodes: CopilotEpisodeOption[];
  resources: CopilotResourceOption[];
}> {
  const encoded = encodeURIComponent(seriesId);
  const [detailResult, plansResult, entitiesResult] = await Promise.allSettled([
    copilotRequest(`/api/series/${encoded}`),
    copilotRequest(`/api/series/${encoded}/plans`),
    copilotRequest(`/api/entities?seriesId=${encoded}`),
  ]);
  const detail = detailResult.status === "fulfilled" ? record(detailResult.value) : {};
  const plans = plansResult.status === "fulfilled" ? record(plansResult.value) : {};
  const entities = entitiesResult.status === "fulfilled" ? record(entitiesResult.value) : {};
  return {
    episodes: (Array.isArray(plans.plans) ? plans.plans : []).map(record).flatMap((item) => {
      const id = stringValue(item.id);
      const episodeNumber = typeof item.episodeNumber === "number" ? item.episodeNumber : 0;
      if (!id || episodeNumber < 1 || item.isActive === false) return [];
      return [
        {
          id,
          seriesId,
          episodeNumber,
          version: typeof item.version === "number" ? item.version : undefined,
          status: stringValue(item.status) || undefined,
        },
      ];
    }),
    resources: [
      ...(Array.isArray(detail.bibles) ? detail.bibles : []).map(record).flatMap((item) => {
        const id = stringValue(item.id);
        if (!id || item.isActive === false) return [];
        const version = typeof item.version === "number" ? ` · v${item.version}` : "";
        return [
          {
            id,
            type: "bible",
            label: `${stringValue(item.title, "Series Bible")}${version}`,
            seriesId,
          },
        ];
      }),
      ...(Array.isArray(entities.entities) ? entities.entities : []).map(record).flatMap((item) => {
        const id = stringValue(item.id);
        const type = stringValue(item.type);
        if (!id || !["character", "location", "prop"].includes(type) || item.status === "archived")
          return [];
        return [{ id, type, label: stringValue(item.name, type), seriesId }];
      }),
    ],
  };
}

export async function loadCopilotEpisodeResources(
  seriesId: string,
  episodePlanId: string,
): Promise<CopilotResourceOption[]> {
  const payload = await copilotRequest(`/api/plans/${encodeURIComponent(episodePlanId)}/scenes`);
  const scenes: unknown[] = Array.isArray(record(payload).scenes)
    ? (record(payload).scenes as unknown[])
    : [];
  return scenes.map(record).flatMap((scene, sceneIndex) => {
    const sceneId = stringValue(scene.id);
    const sceneOrder = typeof scene.order === "number" ? scene.order + 1 : sceneIndex + 1;
    const result: CopilotResourceOption[] = sceneId
      ? [
          {
            id: sceneId,
            type: "scene",
            label: `Scene ${sceneOrder}`,
            seriesId,
            episodePlanId,
          },
        ]
      : [];
    if (Array.isArray(scene.shots)) {
      const shots = scene.shots as unknown[];
      result.push(
        ...shots.map(record).flatMap((shot, shotIndex) => {
          const id = stringValue(shot.id);
          if (!id) return [];
          const order = typeof shot.order === "number" ? shot.order + 1 : shotIndex + 1;
          return [
            {
              id,
              type: "shot",
              label: `Scene ${sceneOrder} · Shot ${order}`,
              seriesId,
              episodePlanId,
            },
          ];
        }),
      );
    }
    return result;
  });
}
