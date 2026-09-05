import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assets, generations, getDb } from "@ai-series/db";
import { getJobDetail } from "@ai-series/jobs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const detail = await getJobDetail(db, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let generation = null;
  let asset = null;
  if (detail.job.generationId) {
    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, detail.job.generationId));
    generation = gen ?? null;
    const [a] = await db
      .select()
      .from(assets)
      .where(eq(assets.generationId, detail.job.generationId));
    asset = a ?? null;
  }

  return NextResponse.json({
    job: detail.job,
    attempts: detail.attempts,
    events: detail.events,
    generation,
    asset,
  });
}
