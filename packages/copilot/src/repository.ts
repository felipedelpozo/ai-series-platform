export type StoredMessage = Readonly<{
  id: string;
  conversationId: string;
  workspaceId: string;
  actorUserId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  clientMessageId?: string;
  causationMessageId?: string;
  sequence: number;
  createdAt: string;
}>;

export type StoredRevision<TPayload = unknown> = Readonly<{
  id: string;
  proposalId: string;
  workspaceId: string;
  clientRevisionId: string;
  basedOnRevisionId?: string;
  revisionNumber: number;
  contentFingerprint: string;
  fingerprint: string;
  payload: TPayload;
  createdAt: string;
}>;

export interface ConversationPersistence {
  transaction<T>(callback: (tx: ConversationPersistenceTransaction) => Promise<T>): Promise<T>;
  pageConversation(input: {
    workspaceId: string;
    conversationId: string;
    cursor?: string;
    limit: number;
  }): Promise<ConversationPage | null>;
}

export interface ConversationPersistenceTransaction {
  lockConversation(input: {
    workspaceId: string;
    conversationId: string;
  }): Promise<{ id: string } | null>;
  findMessageByClientKey(input: {
    workspaceId: string;
    conversationId: string;
    clientMessageId: string;
  }): Promise<StoredMessage | null>;
  insertMessage(
    input: Omit<StoredMessage, "id" | "sequence" | "createdAt">,
  ): Promise<StoredMessage>;
  findRevisionByClientKey<TPayload>(input: {
    workspaceId: string;
    proposalId: string;
    clientRevisionId: string;
  }): Promise<StoredRevision<TPayload> | null>;
  getCurrentRevision<TPayload>(input: {
    workspaceId: string;
    proposalId: string;
  }): Promise<StoredRevision<TPayload> | null>;
  insertRevision<TPayload>(
    input: Omit<StoredRevision<TPayload>, "id" | "revisionNumber" | "createdAt">,
  ): Promise<StoredRevision<TPayload>>;
}

export type ConversationPage = Readonly<{
  conversation: Readonly<Record<string, unknown>>;
  messages: readonly StoredMessage[];
  proposals: readonly Readonly<Record<string, unknown>>[];
  effects: readonly Readonly<Record<string, unknown>>[];
  nextCursor?: string;
}>;

export type ImmutableWriteResult<T> =
  | { ok: true; value: T; replayed: boolean }
  | { ok: false; code: "not_found" | "idempotency_conflict" | "stale_base"; message: string };

export async function appendIdempotentMessage(
  persistence: ConversationPersistence,
  input: Omit<StoredMessage, "id" | "sequence" | "createdAt"> & { clientMessageId: string },
): Promise<ImmutableWriteResult<StoredMessage>> {
  return persistence.transaction(async (tx) => {
    if (!(await tx.lockConversation(input))) {
      return { ok: false, code: "not_found", message: "Conversation not found" };
    }
    const replay = await tx.findMessageByClientKey(input);
    if (replay) {
      return replay.content === input.content && replay.role === input.role
        ? { ok: true, value: replay, replayed: true }
        : {
            ok: false,
            code: "idempotency_conflict",
            message: "Client message key was reused with different content",
          };
    }
    return { ok: true, value: await tx.insertMessage(input), replayed: false };
  });
}

export async function appendIdempotentRevision<TPayload>(
  persistence: ConversationPersistence,
  input: Omit<StoredRevision<TPayload>, "id" | "revisionNumber" | "createdAt"> & {
    contentFingerprint: string;
  },
): Promise<ImmutableWriteResult<StoredRevision<TPayload>>> {
  return persistence.transaction(async (tx) => {
    const replay = await tx.findRevisionByClientKey<TPayload>(input);
    if (replay) {
      return replay.fingerprint === input.fingerprint &&
        replay.contentFingerprint === input.contentFingerprint
        ? { ok: true, value: replay, replayed: true }
        : {
            ok: false,
            code: "idempotency_conflict",
            message: "Client revision key was reused with different content",
          };
    }
    const current = await tx.getCurrentRevision<TPayload>(input);
    if ((current?.id ?? undefined) !== input.basedOnRevisionId) {
      return { ok: false, code: "stale_base", message: "A newer proposal revision exists" };
    }
    return { ok: true, value: await tx.insertRevision(input), replayed: false };
  });
}

export async function getConversationHistory(
  persistence: ConversationPersistence,
  input: { workspaceId: string; conversationId: string; cursor?: string; limit?: number },
): Promise<ConversationPage | null> {
  const limit = Math.max(1, Math.min(100, input.limit ?? 50));
  const page = await persistence.pageConversation({ ...input, limit });
  if (!page) return null;
  return {
    ...page,
    messages: [...page.messages].sort(
      (left, right) =>
        left.sequence - right.sequence || left.createdAt.localeCompare(right.createdAt),
    ),
  };
}
