import { CopilotApiError, copilotJson, route, workspaceForConversation } from "../../_lib/http";
import { projectConversation } from "../../_lib/store";
import { getDb } from "@ai-series/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  return route(request, async (correlationId) => {
    const { conversationId } = await params;
    const auth = await workspaceForConversation(request, conversationId);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    if (cursor && cursor.length > 500)
      throw new CopilotApiError(400, "invalid_cursor", "Conversation cursor is invalid");
    const requestedLimit = url.searchParams.get("limit");
    const limit = requestedLimit === null ? undefined : Number(requestedLimit);
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) {
      throw new CopilotApiError(400, "invalid_input", "limit must be an integer from 1 to 100");
    }
    const projection = await projectConversation(getDb(), auth.workspaceId, conversationId, {
      cursor,
      limit,
    });
    if (!projection) throw new Error("Conversation disappeared");
    return copilotJson(
      { ...projection, context: { ...projection.context, role: auth.role } },
      correlationId,
    );
  });
}
