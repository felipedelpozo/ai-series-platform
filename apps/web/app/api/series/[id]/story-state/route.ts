import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getCurrentStoryState, getStoryStateHistory, recordStoryState } from "@ai-series/story";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentStoryState(getDb(), id);
  const history = await getStoryStateHistory(getDb(), id);
  return NextResponse.json({ current, history });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const stateId = await recordStoryState(getDb(), {
      seriesId: id,
      kind: body.kind ?? "before",
      episode: body.episode,
      data: body.data ?? {},
    });
    return NextResponse.json({ id: stateId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid story state" },
      { status: 400 },
    );
  }
}
