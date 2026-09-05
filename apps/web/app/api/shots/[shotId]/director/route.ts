import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listDirectorSessions, startDirectorSession } from "@ai-series/director";

export async function GET(_request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const sessions = await listDirectorSessions(getDb(), shotId);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json();
  const id = await startDirectorSession(getDb(), {
    shotId,
    initialPrompt: body.initialPrompt ?? "start",
    aspectRatio: body.aspectRatio,
    resolution: body.resolution,
    memory: body.memory,
  });
  return NextResponse.json({ id }, { status: 201 });
}
