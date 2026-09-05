import { schema } from "@ai-series/db";
import { and, eq } from "drizzle-orm";
import {
  CopilotApiError,
  copilotJson,
  jsonBody,
  mutationContext,
  requireString,
  route,
  workspaceForProposal,
} from "../../../../_lib/http";
import { confirmQuote } from "../../../../_lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  return route(request, async (correlationId) => {
    const { proposalId } = await params;
    const access = await workspaceForProposal(request, proposalId);
    const auth = await mutationContext(request, access.workspaceId, "proposal.cost.confirm", {
      role: "owner",
      limit: 30,
    });
    const body = await jsonBody(request);
    const quoteId = requireString(body.quoteId, "quoteId", { uuid: true });
    const [quote] = await auth.db
      .select({ revisionId: schema.copilotCostQuotes.revisionId })
      .from(schema.copilotCostQuotes)
      .innerJoin(
        schema.copilotProposalRevisions,
        and(
          eq(schema.copilotProposalRevisions.id, schema.copilotCostQuotes.revisionId),
          eq(schema.copilotProposalRevisions.workspaceId, schema.copilotCostQuotes.workspaceId),
        ),
      )
      .where(
        and(
          eq(schema.copilotCostQuotes.id, quoteId),
          eq(schema.copilotCostQuotes.workspaceId, auth.workspaceId),
          eq(schema.copilotProposalRevisions.proposalId, proposalId),
        ),
      )
      .limit(1);
    if (!quote?.revisionId) throw new CopilotApiError(404, "not_found", "Cost quote not found");
    const confirmation = await confirmQuote(auth.db, {
      workspaceId: auth.workspaceId,
      actorUserId: auth.user.id,
      revisionId: quote.revisionId,
      correlationId,
      quoteId,
      quoteFingerprint: requireString(body.quoteFingerprint, "quoteFingerprint", { max: 64 }),
    });
    return copilotJson({ confirmation, confirmationId: confirmation.id }, correlationId, 201);
  });
}
