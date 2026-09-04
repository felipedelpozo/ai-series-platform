import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { resolveFinding } from "@ai-series/qa";

export async function POST(request: Request, { params }: { params: Promise<{ findingId: string }> }) {
  const { findingId } = await params;
  const body = await request.json();
  await resolveFinding(getDb(), findingId, body.status, body.resolution);
  return NextResponse.json({ ok: true });
}
