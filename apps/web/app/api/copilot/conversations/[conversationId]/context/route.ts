import { getDb } from "@ai-series/db";
import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireRecord,
  requireString,
  route,
  workspaceForConversation,
} from "../../../_lib/http";
import { changeConversationContext, projectConversation } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  return route(request, async (correlationId) => {
    const { conversationId } = await params;
    const access = await workspaceForConversation(request, conversationId);
    const auth = await mutationContext(request, access.workspaceId, "conversation.context", {
      role: "viewer",
      limit: 30,
    });
    const body = await jsonBody(request);
    const resource = body.resource ? requireRecord(body.resource) : undefined;
    const selection = {
      ...(body.seriesId
        ? { seriesId: requireString(body.seriesId, "seriesId", { uuid: true }) }
        : {}),
      ...(body.episodePlanId
        ? { episodePlanId: requireString(body.episodePlanId, "episodePlanId", { uuid: true }) }
        : {}),
      ...(resource
        ? {
            resource: {
              type: requireString(resource.type, "resource.type", { max: 40 }),
              id: requireString(resource.id, "resource.id", { uuid: true }),
            },
          }
        : {}),
    };
    await changeConversationContext(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      conversationId,
      selection,
      correlationId,
    });
    const projection = await projectConversation(getDb(), auth.workspaceId, conversationId);
    return copilotJson(
      { ...projection, context: { ...projection!.context, role: auth.role } },
      correlationId,
    );
  });
}
