import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../_lib/http";
import { appendProposalRevision } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.revision", {
      role: "editor",
      limit: 30,
    });
    const body = await jsonBody(request);
    const revision = await appendProposalRevision(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      proposalId,
      clientRevisionId: requireString(body.clientRevisionId, "clientRevisionId", { max: 200 }),
      correlationId,
      basedOnRevisionId: body.basedOnRevisionId
        ? requireString(body.basedOnRevisionId, "basedOnRevisionId", { uuid: true })
        : undefined,
      payload: body.payload,
    });
    return copilotJson({ revision }, correlationId, 201);
  });
}
