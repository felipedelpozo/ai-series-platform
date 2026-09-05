import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@ai-series/db";
import { createEntity, EntityTypeSchema, listEntities } from "@ai-series/entities";

const CreateEntityInputSchema = z.object({
  seriesId: z.string(),
  type: EntityTypeSchema,
  name: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
});

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
  try {
    const input = CreateEntityInputSchema.parse(await request.json());
    const id = await createEntity(getDb(), input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create entity" },
      { status: 400 },
    );
  }
}
