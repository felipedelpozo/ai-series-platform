import {
  CopilotApiError,
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../_lib/http";
import { decideRevision } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.decision", {
      role: "editor",
      limit: 30,
    });
    const body = await jsonBody(request);
    const decisionValue =
      body.decision === "approve" || body.decision === "reject" || body.decision === "discard"
        ? body.decision
        : null;
    if (!decisionValue) throw new CopilotApiError(400, "invalid_input", "decision is invalid");
    const decision = await decideRevision(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      proposalId,
      revisionId: requireString(body.revisionId, "revisionId", { uuid: true }),
      fingerprint: requireString(body.fingerprint, "fingerprint", { max: 64 }),
      validationRunId: body.validationRunId
        ? requireString(body.validationRunId, "validationRunId", { uuid: true })
        : undefined,
      decision: decisionValue,
      correlationId,
    });
    return copilotJson({ decision, decisionId: decision.id }, correlationId, 201);
  });
}
