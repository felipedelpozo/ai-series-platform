import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listDecisions, proposeDecision } from "@ai-series/decision";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = new URL(request.url).searchParams.get("episode");
  const decisions = await listDecisions(
    getDb(),
    id,
    episode ? Number(episode) : undefined,
  );
  return NextResponse.json({ decisions });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await proposeDecision(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
    windowId: body.windowId,
    rules: body.rules,
    useAi: body.useAi === true,
  });
  return NextResponse.json(result, { status: 201 });
}
