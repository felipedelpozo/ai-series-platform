import {
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../_lib/http";
import { applyRevision } from "../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.apply", {
      role: "editor",
      limit: 10,
    });
    const body = await jsonBody(request);
    const result = await applyRevision(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      proposalId,
      approvalId: requireString(body.approvalId, "approvalId", { uuid: true }),
      idempotencyKey: requireString(body.idempotencyKey, "idempotencyKey", { max: 200 }),
      correlationId,
    });
    return copilotJson(
      {
        status: "applied",
        receipt: {
          ...result.receipt,
          committedAt: result.receipt.committedAt.toISOString(),
          links: result.receipt.canonicalResults,
        },
        replayed: result.replayed,
      },
      correlationId,
    );
  });
}
