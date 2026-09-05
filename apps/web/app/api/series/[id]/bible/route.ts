import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { BibleSchema, createBibleRevision } from "@ai-series/series";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const parsed = BibleSchema.parse(body);
    const bibleId = await createBibleRevision(getDb(), id, parsed);
    return NextResponse.json({ id: bibleId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "invalid bible" },
      { status: 400 },
    );
  }
}
