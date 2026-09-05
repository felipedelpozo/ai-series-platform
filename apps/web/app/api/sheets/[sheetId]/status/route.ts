import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { updateReferenceSheetStatus } from "@ai-series/entities";

export async function PATCH(request: Request, { params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params;
  const body = await request.json();
  await updateReferenceSheetStatus(getDb(), sheetId, body.status);
  return NextResponse.json({ ok: true });
}
