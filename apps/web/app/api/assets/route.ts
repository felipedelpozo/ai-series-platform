import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { assets, getDb } from "@ai-series/db";

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind") ?? undefined;
  const rows = await getDb()
    .select()
    .from(assets)
    .where(kind ? eq(assets.kind, kind) : undefined)
    .orderBy(desc(assets.createdAt))
    .limit(100);
  return NextResponse.json({ assets: rows });
}
