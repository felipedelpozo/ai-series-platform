import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { publishEpisode } from "@ai-series/tiktok";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await publishEpisode(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
  });
  return NextResponse.json(result);
}
