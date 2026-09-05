import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireConversationMessage,
  requireString,
  route,
  workspaceForConversation,
} from "../../../../../../_lib/http";
import { confirmQuote } from "../../../../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> },
) {
  return route(request, async (correlationId) => {
    const { conversationId, messageId } = await params;
    const access = await workspaceForConversation(request, conversationId);
    const auth = await mutationContext(request, access.workspaceId, "message.cost.confirm", {
      role: "owner",
      limit: 30,
    });
    await requireConversationMessage(auth.db, {
      workspaceId: auth.workspaceId,
      conversationId,
      messageId,
    });
    const body = await jsonBody(request);
    const confirmation = await confirmQuote(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      messageId,
      correlationId,
      quoteId: requireString(body.quoteId, "quoteId", { uuid: true }),
      quoteFingerprint: requireString(body.quoteFingerprint, "quoteFingerprint", { max: 64 }),
    });
    return copilotJson({ confirmation, confirmationId: confirmation.id }, correlationId, 201);
  });
}
