import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { deleteAsset, getAssetDetail, updateAssetStatus, type AssetStatus } from "@ai-series/media";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAssetDetail(getDb(), id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  try {
    const result = await updateAssetStatus(getDb(), id, body.status as AssetStatus);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteAsset(getDb(), id);
  if (!result.deleted) {
    return NextResponse.json(
      { error: result.reason === "has-children" ? "Asset has dependent children" : "Not found" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
