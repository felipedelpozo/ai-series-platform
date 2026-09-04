import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateLoopPlan } from "@ai-series/loop";

export async function POST(_request: Request, { params }: { params: Promise<{ loopId: string }> }) {
  const { loopId } = await params;
  try {
    const planId = await generateLoopPlan(getDb(), loopId);
    return NextResponse.json({ planId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to generate plan" },
      { status: 400 },
    );
  }
}
