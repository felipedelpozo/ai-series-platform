import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { activatePromptVersion } from "@ai-series/prompts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const { versionId } = await params;
  await activatePromptVersion(getDb(), versionId);
  return NextResponse.json({ ok: true });
}
