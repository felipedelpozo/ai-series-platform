import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../_lib/http";
import { validateRevision } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.validate", {
      role: "editor",
      limit: 30,
    });
    const body = await jsonBody(request);
    const result = await validateRevision(auth.db, {
      workspaceId: auth.workspaceId,
      proposalId,
      revisionId: requireString(body.revisionId, "revisionId", { uuid: true }),
      fingerprint: requireString(body.fingerprint, "fingerprint", { max: 64 }),
      actorUserId: auth.user.id,
      correlationId,
    });
    const status =
      result.validation.status === "invalid"
        ? 422
        : result.validation.status === "stale"
          ? 409
          : 200;
    return copilotJson(result, correlationId, status);
  });
}
