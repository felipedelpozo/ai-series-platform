import { getDb } from "@ai-series/db";
import { requireUser } from "@/lib/auth";
import {
  CopilotApiError,
  copilotJson,
  jsonBody,
  mutationContext,
  requireRecord,
  requireString,
  route,
  workspaceForSeries,
  workspaceForUser,
} from "../_lib/http";
import { createConversation, listAuthorizedConversations } from "../_lib/store";

export async function GET(request: Request) {
  return route(request, async (correlationId) => {
    const db = getDb();
    const user = await requireUser(request, db);
    if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
    return copilotJson(
      { conversations: await listAuthorizedConversations(db, user.id) },
      correlationId,
    );
  });
}

export async function POST(request: Request) {
  return route(request, async (correlationId) => {
    const sessionDb = getDb();
    const signedInUser = await requireUser(request, sessionDb);
    if (!signedInUser) throw new CopilotApiError(401, "unauthenticated", "Authentication required");
    const body = await jsonBody(request);
    const mode = body.mode === "query" || body.mode === "actionable" ? body.mode : null;
    if (!mode) throw new CopilotApiError(400, "invalid_input", "mode is required");
    const context = body.context === undefined ? {} : requireRecord(body.context);
    const seriesId = context.seriesId
      ? requireString(context.seriesId, "context.seriesId", { uuid: true })
      : undefined;
    const access = seriesId
      ? await workspaceForSeries(request, seriesId)
      : await workspaceForUser(request);
    const auth = await mutationContext(request, access.workspaceId, "conversation.create", {
      role: mode === "actionable" ? "editor" : "viewer",
      limit: 30,
    });
    const resource = context.resource ? requireRecord(context.resource) : undefined;
    const selection = {
      ...(seriesId ? { seriesId } : {}),
      ...(context.episodePlanId
        ? {
            episodePlanId: requireString(context.episodePlanId, "context.episodePlanId", {
              uuid: true,
            }),
          }
        : {}),
      ...(resource
        ? {
            resource: {
              type: requireString(resource.type, "context.resource.type", { max: 40 }),
              id: requireString(resource.id, "context.resource.id", { uuid: true }),
            },
          }
        : {}),
    };
    const created = await createConversation(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      role: auth.role,
      correlationId,
      title: body.title ? requireString(body.title, "title", { max: 160 }) : "New conversation",
      selection,
    });
    return copilotJson(created, correlationId, 201);
  });
}
