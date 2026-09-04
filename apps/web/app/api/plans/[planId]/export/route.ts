import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { exportEpisode } from "@ai-series/composition";

export async function POST(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  try {
    const result = await exportEpisode(getDb(), { planId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "export failed" },
      { status: 400 },
    );
  }
}
