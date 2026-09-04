import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getShotPreview } from "@ai-series/production";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preview = await getShotPreview(getDb(), id);
  return NextResponse.json(preview);
}
