import { getDb, schema, type Db } from "@ai-series/db";
import { listWorkspacesForUser, type PublicUser, type Role } from "@ai-series/accounts";
import { and, eq } from "drizzle-orm";
import {
  CopilotApiError,
  authorizeCopilotRequest,
  copilotErrorResponse,
  copilotJson,
  correlationIdForRequest,
  readBoundedJson,
  reserveCopilotRateLimit,
} from "@/lib/copilot-api";
import { requireUser } from "@/lib/auth";

export type RouteContext = {
  db: Db;
  user: PublicUser;
  workspaceId: string;
  role: Role;
  correlationId: string;
};

export function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CopilotApiError(400, "invalid_input", "Request body must be an object");
  }
  return value as Record<string, unknown>;
}

export function requireString(
  value: unknown,
  name: string,
  options: { max?: number; uuid?: boolean } = {},
): string {
  if (typeof value !== "string") {
    throw new CopilotApiError(400, "invalid_input", `${name} is required`);
  }
  const normalized = value.trim();
  const max = options.max ?? 20_000;
  if (!normalized || normalized.length > max) {
    throw new CopilotApiError(400, "invalid_input", `${name} is invalid`);
  }
  if (
    options.uuid &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
  ) {
    throw new CopilotApiError(400, "invalid_input", `${name} is invalid`);
  }
  return normalized;
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  return requireRecord(await readBoundedJson(request));
}

export async function workspaceForUser(request: Request, requestedWorkspaceId?: string) {
  const db = getDb();
  const user = await requireUser(request, db);
  if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
  const accesses = await listWorkspacesForUser(db, user.id);
  const access = requestedWorkspaceId
    ? accesses.find(({ workspace }) => workspace.id === requestedWorkspaceId)
    : accesses[0];
  if (!access) throw new CopilotApiError(404, "workspace_not_found", "Workspace not found");
  return { db, user, workspaceId: access.workspace.id, role: access.role };
}

export async function workspaceForSeries(request: Request, seriesId: string) {
  const db = getDb();
  const user = await requireUser(request, db);
  if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
  const [row] = await db
    .select({ workspaceId: schema.series.workspaceId, role: schema.workspaceMembers.role })
    .from(schema.series)
    .innerJoin(
      schema.workspaceMembers,
      and(
        eq(schema.workspaceMembers.workspaceId, schema.series.workspaceId),
        eq(schema.workspaceMembers.userId, user.id),
      ),
    )
    .where(eq(schema.series.id, seriesId))
    .limit(1);
  if (!row) throw new CopilotApiError(404, "not_found", "Context not found");
  return { db, user, workspaceId: row.workspaceId, role: row.role as Role };
}

export async function workspaceForConversation(request: Request, conversationId: string) {
  const db = getDb();
  const user = await requireUser(request, db);
  if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
  const [row] = await db
    .select({
      workspaceId: schema.copilotConversations.workspaceId,
      role: schema.workspaceMembers.role,
    })
    .from(schema.copilotConversations)
    .innerJoin(
      schema.workspaceMembers,
      and(
        eq(schema.workspaceMembers.workspaceId, schema.copilotConversations.workspaceId),
        eq(schema.workspaceMembers.userId, user.id),
      ),
    )
    .where(eq(schema.copilotConversations.id, conversationId))
    .limit(1);
  if (!row) throw new CopilotApiError(404, "not_found", "Conversation not found");
  return { user, workspaceId: row.workspaceId, role: row.role as Role };
}

export async function workspaceForProposal(request: Request, proposalId: string) {
  const db = getDb();
  const user = await requireUser(request, db);
  if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
  const [row] = await db
    .select({
      workspaceId: schema.copilotProposals.workspaceId,
      role: schema.workspaceMembers.role,
    })
    .from(schema.copilotProposals)
    .innerJoin(
      schema.workspaceMembers,
      and(
        eq(schema.workspaceMembers.workspaceId, schema.copilotProposals.workspaceId),
        eq(schema.workspaceMembers.userId, user.id),
      ),
    )
    .where(eq(schema.copilotProposals.id, proposalId))
    .limit(1);
  if (!row) throw new CopilotApiError(404, "not_found", "Proposal not found");
  return { user, workspaceId: row.workspaceId, role: row.role as Role };
}

export async function requireConversationMessage(
  db: Db,
  input: { workspaceId: string; conversationId: string; messageId: string },
) {
  const [message] = await db
    .select()
    .from(schema.copilotMessages)
    .where(
      and(
        eq(schema.copilotMessages.id, input.messageId),
        eq(schema.copilotMessages.conversationId, input.conversationId),
        eq(schema.copilotMessages.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);
  if (!message) throw new CopilotApiError(404, "not_found", "Message not found");
  return message;
}

export async function mutationContext(
  request: Request,
  workspaceId: string,
  operation: string,
  options: { role?: Role; limit?: number } = {},
): Promise<RouteContext> {
  const db = getDb();
  const auth = await authorizeCopilotRequest(request, {
    workspaceId,
    requiredRole: options.role ?? "editor",
    mutation: true,
    db,
  });
  await reserveCopilotRateLimit(db, {
    workspaceId,
    actorUserId: auth.user.id,
    operation,
    limit: options.limit ?? 60,
    windowMs: 60_000,
  });
  return { ...auth, db, correlationId: correlationIdForRequest(request) };
}

export async function route(
  request: Request,
  action: (correlationId: string) => Promise<Response>,
): Promise<Response> {
  const correlationId = correlationIdForRequest(request);
  try {
    return await action(correlationId);
  } catch (error) {
    return copilotErrorResponse(error, correlationId);
  }
}

export { CopilotApiError, copilotJson };
