import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../../_lib/http";
import { createProposalCostQuote } from "../../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.cost.quote", {
      role: "owner",
      limit: 30,
    });
    const body = await jsonBody(request);
    const quote = await createProposalCostQuote(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      proposalId,
      revisionId: requireString(body.revisionId, "revisionId", { uuid: true }),
      fingerprint: requireString(body.fingerprint, "fingerprint", { max: 64 }),
      scope: body.scope,
    });
    return copilotJson({ quote }, correlationId, 201);
  });
}
