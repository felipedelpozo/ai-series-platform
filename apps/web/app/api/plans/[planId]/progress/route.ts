import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getPlanProgress } from "@ai-series/production";

export async function GET(_request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const progress = await getPlanProgress(getDb(), planId);
  return NextResponse.json(progress);
}
