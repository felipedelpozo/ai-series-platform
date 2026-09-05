import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { updateDirectorPrompt } from "@ai-series/director";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const body = await request.json();
  const version = await updateDirectorPrompt(getDb(), sessionId, body.prompt);
  return NextResponse.json({ promptVersion: version });
}
