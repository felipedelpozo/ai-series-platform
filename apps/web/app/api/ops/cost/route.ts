import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { costByEpisode, costBySeries } from "@ai-series/ops";

export async function GET(request: Request) {
  const seriesId = new URL(request.url).searchParams.get("seriesId") ?? undefined;
  const db = getDb();
  const bySeries = await costBySeries(db);
  const byEpisode = seriesId ? await costByEpisode(db, seriesId) : [];
  return NextResponse.json({ bySeries, byEpisode });
}
