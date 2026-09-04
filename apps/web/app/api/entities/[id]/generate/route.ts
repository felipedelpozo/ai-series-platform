import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateEntityProposal } from "@ai-series/entities";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const versionId = await generateEntityProposal(getDb(), id);
    return NextResponse.json({ versionId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
