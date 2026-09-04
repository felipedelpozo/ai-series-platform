import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { createSeries, listSeries } from "@ai-series/series";

export async function GET() {
  const rows = await listSeries(getDb());
  return NextResponse.json({ series: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const id = await createSeries(getDb(), { name: body.name, slug: body.slug });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create series" },
      { status: 400 },
    );
  }
}
