import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getSignalStats, importSignals } from "@ai-series/audience";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const episode = Number(new URL(request.url).searchParams.get("episode") ?? "1");
  const stats = await getSignalStats(getDb(), id, episode);
  return NextResponse.json(stats);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await importSignals(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
    windowId: body.windowId,
    signals: body.signals ?? [],
  });
  return NextResponse.json(result, { status: 201 });
}
