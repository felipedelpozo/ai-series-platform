import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { cleanupJob } from "@ai-series/ops";

export async function POST(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  try {
    await cleanupJob(getDb(), jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "cleanup failed" },
      { status: 400 },
    );
  }
}
