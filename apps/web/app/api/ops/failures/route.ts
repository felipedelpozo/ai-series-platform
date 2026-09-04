import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { findFailedJobTrace } from "@ai-series/ops";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("seriesId") ?? undefined;
  const episodeNumber = url.searchParams.get("episodeNumber");
  const trace = await findFailedJobTrace(getDb(), {
    seriesId,
    episodeNumber: episodeNumber ? Number(episodeNumber) : undefined,
  });
  return NextResponse.json({ trace });
}
