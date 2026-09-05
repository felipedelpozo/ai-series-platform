import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { clonePromptTemplate } from "@ai-series/prompts";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await clonePromptTemplate(getDb(), id), { status: 201 });
}
