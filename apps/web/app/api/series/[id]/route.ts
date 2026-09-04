import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { archiveSeries, getSeriesDetail, renameSeries } from "@ai-series/series";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getSeriesDetail(getDb(), id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (body.name) {
    await renameSeries(getDb(), id, body.name);
  }
  if (body.status === "archived") {
    await archiveSeries(getDb(), id);
  }
  return NextResponse.json({ ok: true });
}
