import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getShotPreview } from "@ai-series/production";

export async function GET(_request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const preview = await getShotPreview(getDb(), shotId);
  return NextResponse.json(preview);
}
