import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { updateShotStatus } from "@ai-series/planner";

export async function PATCH(request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json();
  await updateShotStatus(getDb(), shotId, body.status);
  return NextResponse.json({ ok: true });
}
