import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { createBranch } from "@ai-series/loop";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const branchId = await createBranch(getDb(), {
    seriesId: id,
    name: body.name ?? "Alternative branch",
    baseEpisode: body.baseEpisode ?? 1,
    parentBranchId: body.parentBranchId,
  });
  return NextResponse.json({ id: branchId }, { status: 201 });
}
