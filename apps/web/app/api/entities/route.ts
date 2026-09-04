import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { createEntity, listEntities } from "@ai-series/entities";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("seriesId") ?? "";
  const type = url.searchParams.get("type") ?? undefined;
  const rows = seriesId
    ? await listEntities(getDb(), seriesId, type as "character" | "location" | "prop" | undefined)
    : [];
  return NextResponse.json({ entities: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const id = await createEntity(getDb(), {
      seriesId: body.seriesId,
      type: body.type,
      name: body.name,
      data: body.data ?? {},
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create entity" },
      { status: 400 },
    );
  }
}
