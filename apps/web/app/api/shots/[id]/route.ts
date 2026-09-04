import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { updateShotData } from "@ai-series/planner";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  await updateShotData(getDb(), id, body.data ?? {});
  return NextResponse.json({ ok: true });
}
