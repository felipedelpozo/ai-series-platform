import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { activateBibleRevision } from "@ai-series/series";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bibleId: string }> },
) {
  const { bibleId } = await params;
  await activateBibleRevision(getDb(), bibleId);
  return NextResponse.json({ ok: true });
}
