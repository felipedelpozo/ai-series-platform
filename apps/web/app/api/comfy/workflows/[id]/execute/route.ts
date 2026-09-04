import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { executeWorkflow } from "@ai-series/comfy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await executeWorkflow(getDb(), id, body.input ?? {});
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
