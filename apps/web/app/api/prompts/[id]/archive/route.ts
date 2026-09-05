import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { archivePromptTemplate } from "@ai-series/prompts";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await archivePromptTemplate(getDb(), id);
  return NextResponse.json({ ok: true });
}
