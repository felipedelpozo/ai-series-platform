import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateAllKeyframes, generateAllVideos } from "@ai-series/production";

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const body = await request.json();
  const kind = body.kind === "video" ? "video" : "keyframe";
  const count =
    kind === "video"
      ? await generateAllVideos(getDb(), planId)
      : await generateAllKeyframes(getDb(), planId);
  return NextResponse.json({ created: count }, { status: 201 });
}
