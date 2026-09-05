import { classifyIntent } from "@ai-series/copilot";
import { getDb } from "@ai-series/db";
import { assertCopilotMutationOrigin } from "@/lib/copilot-api";
import {
  CopilotApiError,
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForConversation,
} from "../../../_lib/http";
import { appendUserMessage, projectConversation } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  return route(request, async (correlationId) => {
    const { conversationId } = await params;
    const access = await workspaceForConversation(request, conversationId);
    assertCopilotMutationOrigin(request);
    const body = await jsonBody(request);
    const content = requireString(body.content, "content", { max: 20_000 });
    const classification = classifyIntent(content);
    if (access.role === "viewer" && classification !== "query") {
      throw new CopilotApiError(403, "forbidden", "Viewer conversations are read-only");
    }
    const auth = await mutationContext(request, access.workspaceId, "message.create", {
      role: classification === "query" ? "viewer" : "editor",
      limit: 60,
    });
    await appendUserMessage(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      conversationId,
      clientMessageId: requireString(body.clientMessageId, "clientMessageId", { max: 200 }),
      content,
      visibleContextFingerprint: requireString(
        body.visibleContextFingerprint,
        "visibleContextFingerprint",
        { max: 64 },
      ),
      correlationId,
    });
    const projection = await projectConversation(getDb(), auth.workspaceId, conversationId);
    return copilotJson(
      { ...projection, context: { ...projection!.context, role: auth.role } },
      correlationId,
    );
  });
}
