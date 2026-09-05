import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { attachReferenceAsset } from "@ai-series/entities";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const refId = await attachReferenceAsset(getDb(), {
    entityType: body.entityType,
    entityId: id,
    assetId: body.assetId,
    status: body.status,
  });
  return NextResponse.json({ id: refId }, { status: 201 });
}
