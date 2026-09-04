import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { stopDirectorSession } from "@ai-series/director";

export async function POST(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  await stopDirectorSession(getDb(), sessionId);
  return NextResponse.json({ ok: true });
}
