import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { importEngagement } from "@ai-series/tiktok";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await importEngagement(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
    events: body.events ?? [],
    source: body.source,
    correlationId: body.correlationId,
  });
  return NextResponse.json(result, { status: 201 });
}
