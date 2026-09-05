import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { getConnectionStatus } from "@ai-series/tiktok";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getConnectionStatus(getDb(), id);
  return NextResponse.json(status);
}
