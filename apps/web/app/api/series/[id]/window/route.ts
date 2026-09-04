import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { openWindow } from "@ai-series/audience";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const windowId = await openWindow(getDb(), {
    seriesId: id,
    episodeNumber: body.episodeNumber ?? 1,
  });
  return NextResponse.json({ id: windowId }, { status: 201 });
}
