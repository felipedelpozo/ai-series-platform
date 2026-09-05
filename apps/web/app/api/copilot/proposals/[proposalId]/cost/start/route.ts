import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../../_lib/http";
import { startPaidCost } from "../../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.cost.start", {
      role: "owner",
      limit: 10,
    });
    const body = await jsonBody(request);
    const result = await startPaidCost(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      proposalId,
      confirmationId: requireString(body.confirmationId, "confirmationId", { uuid: true }),
      idempotencyKey: requireString(body.idempotencyKey, "idempotencyKey", { max: 200 }),
      correlationId,
    });
    return copilotJson(result, correlationId, result.created ? 201 : 200);
  });
}
