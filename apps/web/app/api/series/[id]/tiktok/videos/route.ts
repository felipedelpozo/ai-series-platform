import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { associateVideo } from "@ai-series/tiktok";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const videoId = await associateVideo(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
    url: body.url,
    providerVideoId: body.providerVideoId,
    metadata: body.metadata,
  });
  return NextResponse.json({ id: videoId }, { status: 201 });
}
