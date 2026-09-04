import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateEpisodePlan, listEpisodePlans } from "@ai-series/planner";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plans = await listEpisodePlans(getDb(), id);
  return NextResponse.json({ plans });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const planId = await generateEpisodePlan(getDb(), {
      seriesId: id,
      episodeNumber: body.episodeNumber ?? 1,
      audienceDecision: body.audienceDecision,
    });
    return NextResponse.json({ id: planId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
