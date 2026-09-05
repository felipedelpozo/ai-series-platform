import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listFindings, runDeterministicChecks, runLlmQa } from "@ai-series/qa";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const findings = await listFindings(getDb(), planId);
  return NextResponse.json({ findings });
}

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const body = await request.json();
  const deterministic = await runDeterministicChecks(getDb(), planId);
  const ai = body.includeAi ? await runLlmQa(getDb(), planId) : 0;
  return NextResponse.json({ deterministic, ai }, { status: 201 });
}
