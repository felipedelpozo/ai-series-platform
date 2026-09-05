import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { approveEpisodePlan } from "@ai-series/planner";

export async function POST(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  await approveEpisodePlan(getDb(), planId);
  return NextResponse.json({ ok: true });
}
