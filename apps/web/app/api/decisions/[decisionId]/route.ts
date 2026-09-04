import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getDecision } from "@ai-series/decision";

export async function GET(_request: Request, { params }: { params: Promise<{ decisionId: string }> }) {
  const { decisionId } = await params;
  const detail = await getDecision(getDb(), decisionId);
  if (!detail) return NextResponse.json({ error: "Decision not found" }, { status: 404 });
  return NextResponse.json(detail);
}
