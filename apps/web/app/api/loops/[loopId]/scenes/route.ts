import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateLoopScenes } from "@ai-series/loop";

export async function POST(_request: Request, { params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params;
  try {
    const count = await generateLoopScenes(getDb(), loopId);
    return NextResponse.json({ shotsCreated: count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to generate scenes" },
      { status: 400 },
    );
  }
}
