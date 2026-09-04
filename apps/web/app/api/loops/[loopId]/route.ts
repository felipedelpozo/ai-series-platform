import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getLoop } from "@ai-series/loop";

export async function GET(_request: Request, { params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params;
  const detail = await getLoop(getDb(), loopId);
  if (!detail) return NextResponse.json({ error: "Loop not found" }, { status: 404 });
  return NextResponse.json(detail);
}
