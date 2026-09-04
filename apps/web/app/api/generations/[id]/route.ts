import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assets, getDb } from "@ai-series/db";
import { pollImageGeneration } from "@ai-series/generation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const generation = await pollImageGeneration(getDb(), id);
  const [asset] = await getDb()
    .select()
    .from(assets)
    .where(eq(assets.generationId, id));
  return NextResponse.json({ generation, asset });
}
