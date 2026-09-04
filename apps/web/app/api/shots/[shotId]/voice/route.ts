import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateVoiceTrack, listAudioTracks } from "@ai-series/audio";

export async function GET(_request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const tracks = await listAudioTracks(getDb(), shotId);
  return NextResponse.json({ tracks });
}

export async function POST(request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json();
  try {
    const trackId = await generateVoiceTrack(getDb(), {
      shotId,
      text: body.text ?? "narrated line",
      voice: body.voice,
    });
    return NextResponse.json({ id: trackId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "voice generation failed" },
      { status: 400 },
    );
  }
}
