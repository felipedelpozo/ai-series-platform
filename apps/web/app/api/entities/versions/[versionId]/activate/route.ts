import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { activateEntityVersion } from "@ai-series/entities";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  await activateEntityVersion(getDb(), versionId);
  return NextResponse.json({ ok: true });
}
