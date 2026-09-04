import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateBibleProposal } from "@ai-series/series";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const bibleId = await generateBibleProposal(getDb(), id);
    return NextResponse.json({ id: bibleId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
