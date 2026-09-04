import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { closeWindow } from "@ai-series/audience";

export async function POST(_request: Request, { params }: { params: Promise<{ windowId: string }> }) {
  const { windowId } = await params;
  await closeWindow(getDb(), windowId);
  return NextResponse.json({ ok: true });
}
