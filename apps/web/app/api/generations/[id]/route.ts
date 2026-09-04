import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assets, generations, getDb } from "@ai-series/db";
import { pollImageGeneration, pollVideoGeneration } from "@ai-series/generation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const [existing] = await db.select().from(generations).where(eq(generations.id, id));
  const generation =
    existing?.kind === "video"
      ? await pollVideoGeneration(db, id)
      : await pollImageGeneration(db, id);
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.generationId, id));
  return NextResponse.json({ generation, asset });
}
