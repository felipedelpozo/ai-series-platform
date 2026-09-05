import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateSceneShotList, listScenesWithShots } from "@ai-series/planner";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const scenes = await listScenesWithShots(getDb(), planId);
  return NextResponse.json({ scenes });
}

export async function POST(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  try {
    const count = await generateSceneShotList(getDb(), { planId });
    return NextResponse.json({ shots: count }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
