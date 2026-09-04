import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateShotKeyframe, generateShotVideo } from "@ai-series/production";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const kind = body.kind === "video" ? "video" : "keyframe";
  const result =
    kind === "video"
      ? await generateShotVideo(getDb(), { shotId: id })
      : await generateShotKeyframe(getDb(), { shotId: id });
  return NextResponse.json(result, { status: 201 });
}
