import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { editEntity, getEntityDetail } from "@ai-series/entities";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getEntityDetail(getDb(), id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const versionId = await editEntity(getDb(), id, { name: body.name, data: body.data });
  return NextResponse.json({ versionId });
}
