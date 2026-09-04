import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { createPromptTemplate, listPromptTemplates } from "@ai-series/prompts";

export async function GET(request: Request) {
  const purpose = new URL(request.url).searchParams.get("purpose") ?? undefined;
  const templates = await listPromptTemplates(getDb(), purpose);
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createPromptTemplate(getDb(), body);
  return NextResponse.json(result, { status: 201 });
}
