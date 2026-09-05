import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { updateShotData } from "@ai-series/planner";

export async function PATCH(request: Request, { params }: { params: Promise<{ shotId: string }> }) {
  const { shotId } = await params;
  const body = await request.json();
  await updateShotData(getDb(), shotId, body.data ?? {});
  return NextResponse.json({ ok: true });
}
