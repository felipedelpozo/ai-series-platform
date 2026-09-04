import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { applyApprovedDecision, listBranches, listDecisionTimeline } from "@ai-series/loop";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loops, branches] = await Promise.all([
    listDecisionTimeline(getDb(), id),
    listBranches(getDb(), id),
  ]);
  return NextResponse.json({ loops, branches });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const result = await applyApprovedDecision(getDb(), {
      seriesId: id,
      decisionId: body.decisionId,
      branchId: body.branchId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to apply decision" },
      { status: 400 },
    );
  }
}
