import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { approveDecision } from "@ai-series/decision";

export async function POST(request: Request, { params }: { params: Promise<{ decisionId: string }> }) {
  const { decisionId } = await params;
  const body = await request.json().catch(() => ({}));
  await approveDecision(getDb(), decisionId, {
    candidateId: body.candidateId,
    by: body.by,
  });
  return NextResponse.json({ ok: true });
}
