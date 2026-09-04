import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { startLoopGeneration } from "@ai-series/loop";

export async function POST(_request: Request, { params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params;
  try {
    const keyframes = await startLoopGeneration(getDb(), loopId);
    return NextResponse.json({ keyframesEnqueued: keyframes });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to start generation" },
      { status: 400 },
    );
  }
}
