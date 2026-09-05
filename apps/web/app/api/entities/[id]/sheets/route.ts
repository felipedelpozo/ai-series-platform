import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { generateReferenceSheet, listReferenceSheets } from "@ai-series/entities";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sheets = await listReferenceSheets(getDb(), id);
  return NextResponse.json({ sheets });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const result = await generateReferenceSheet(getDb(), {
      entityId: id,
      panels: body.panels,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to generate sheet" },
      { status: 400 },
    );
  }
}
