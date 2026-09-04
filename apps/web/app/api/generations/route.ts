import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { generations, getDb } from "@ai-series/db";
import { startImageGeneration } from "@ai-series/generation";

export async function GET() {
  const rows = await getDb().select().from(generations).orderBy(desc(generations.createdAt)).limit(50);
  return NextResponse.json({ generations: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await startImageGeneration(getDb(), body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
