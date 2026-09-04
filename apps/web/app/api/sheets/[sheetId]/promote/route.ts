import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { promoteReferenceSheet } from "@ai-series/entities";

export async function POST(_request: Request, { params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params;
  try {
    const refId = await promoteReferenceSheet(getDb(), sheetId);
    return NextResponse.json({ id: refId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to promote" },
      { status: 400 },
    );
  }
}
