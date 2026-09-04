import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { checkBudget } from "@ai-series/ops";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitUsd = Number(url.searchParams.get("limitUsd") ?? "10");
  const seriesId = url.searchParams.get("seriesId") ?? undefined;
  const result = await checkBudget(getDb(), { limitUsd, seriesId });
  return NextResponse.json(result);
}
