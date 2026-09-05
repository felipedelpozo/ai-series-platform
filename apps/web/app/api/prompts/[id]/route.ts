import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { editPromptTemplate, getPromptDetail } from "@ai-series/prompts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPromptDetail(getDb(), id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const result = await editPromptTemplate(getDb(), id, body);
  return NextResponse.json(result);
}
