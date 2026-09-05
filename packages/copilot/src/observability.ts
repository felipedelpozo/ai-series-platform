export type CopilotAuditLevel = "info" | "warn" | "error";

export type CopilotAuditEvent = Readonly<{
  name: string;
  level: CopilotAuditLevel;
  occurredAt: string;
  correlationId: string;
  workspaceId: string;
  actorUserId?: string;
  conversationId?: string;
  proposalId?: string;
  revisionId?: string;
  applicationId?: string;
  outcome?: string;
  attributes?: Readonly<Record<string, unknown>>;
}>;

export interface CopilotAuditSink {
  write(event: CopilotAuditEvent): void | Promise<void>;
}

const SENSITIVE_KEY =
  /(?:authorization|cookie|password|secret|token|api.?key|prompt|content|message|signed.?url)/i;
const MAX_STRING_LENGTH = 512;
const MAX_DEPTH = 5;

export function redactAuditValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactAuditValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, nested]) => [
          key,
          SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactAuditValue(nested, depth + 1),
        ]),
    );
  }
  return value;
}

export function createAuditEvent(
  input: Omit<CopilotAuditEvent, "occurredAt" | "attributes"> & {
    occurredAt?: string;
    attributes?: Readonly<Record<string, unknown>>;
  },
): CopilotAuditEvent {
  return Object.freeze({
    ...input,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    attributes: input.attributes
      ? (redactAuditValue(input.attributes) as Readonly<Record<string, unknown>>)
      : undefined,
  });
}

export async function audit(
  sink: CopilotAuditSink | undefined,
  event: Parameters<typeof createAuditEvent>[0],
): Promise<void> {
  if (!sink) return;
  await sink.write(createAuditEvent(event));
}

export interface CopilotRetentionStore {
  workspaceExists(workspaceId: string): Promise<boolean>;
  deleteExpiredOperationalState(input: { workspaceId: string; before: Date }): Promise<number>;
  purgeWorkspaceConversationContent(workspaceId: string): Promise<number>;
  redactRequiredProvenance(workspaceId: string): Promise<number>;
}

export async function enforceWorkspaceLifetimeRetention(
  store: CopilotRetentionStore,
  input: { workspaceId: string; now?: Date },
): Promise<
  Readonly<{
    expiredOperationalRows: number;
    purgedContentRows: number;
    redactedProvenanceRows: number;
  }>
> {
  const now = input.now ?? new Date();
  const expiredOperationalRows = await store.deleteExpiredOperationalState({
    workspaceId: input.workspaceId,
    before: now,
  });
  if (await store.workspaceExists(input.workspaceId)) {
    return { expiredOperationalRows, purgedContentRows: 0, redactedProvenanceRows: 0 };
  }
  const purgedContentRows = await store.purgeWorkspaceConversationContent(input.workspaceId);
  const redactedProvenanceRows = await store.redactRequiredProvenance(input.workspaceId);
  return { expiredOperationalRows, purgedContentRows, redactedProvenanceRows };
}
