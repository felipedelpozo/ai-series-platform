import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireConversationMessage,
  requireString,
  route,
  workspaceForConversation,
} from "../../../../../_lib/http";
import { generateConfirmedMessage, projectConversation } from "../../../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> },
) {
  return route(request, async (correlationId) => {
    const { conversationId, messageId } = await params;
    const access = await workspaceForConversation(request, conversationId);
    const auth = await mutationContext(request, access.workspaceId, "message.generate", {
      role: "owner",
      limit: 10,
    });
    await requireConversationMessage(auth.db, {
      workspaceId: auth.workspaceId,
      conversationId,
      messageId,
    });
    const body = await jsonBody(request);
    await generateConfirmedMessage(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      conversationId,
      messageId,
      confirmationId: requireString(body.confirmationId, "confirmationId", { uuid: true }),
      idempotencyKey: requireString(body.idempotencyKey, "idempotencyKey", { max: 200 }),
      correlationId,
    });
    const projection = await projectConversation(auth.db, auth.workspaceId, conversationId);
    return copilotJson(
      { ...projection, context: { ...projection!.context, role: auth.role } },
      correlationId,
    );
  });
}
