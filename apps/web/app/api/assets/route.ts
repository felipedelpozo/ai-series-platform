import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listAssets } from "@ai-series/media";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = {
    kind: url.searchParams.get("kind") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };
  const rows = await listAssets(getDb(), filters);
  return NextResponse.json({ assets: rows });
}
