import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { rejectDecision } from "@ai-series/decision";

export async function POST(request: Request, { params }: { params: Promise<{ decisionId: string }> }) {
  const { decisionId } = await params;
  const body = await request.json().catch(() => ({}));
  await rejectDecision(getDb(), decisionId, body.by);
  return NextResponse.json({ ok: true });
}
