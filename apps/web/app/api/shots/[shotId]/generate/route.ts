import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateShotKeyframe, generateShotVideo } from "@ai-series/production";

export async function POST(request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json();
  const kind = body.kind === "video" ? "video" : "keyframe";
  const result =
    kind === "video"
      ? await generateShotVideo(getDb(), { shotId })
      : await generateShotKeyframe(getDb(), { shotId });
  return NextResponse.json(result, { status: 201 });
}
