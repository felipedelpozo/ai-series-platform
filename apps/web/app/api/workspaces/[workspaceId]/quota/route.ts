import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { assertRole, getWorkspaceQuota, setWorkspaceQuota } from "@ai-series/accounts";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await assertRole(getDb(), { workspaceId, userId: user.id, role: "viewer" });
  } catch {
    return NextResponse.json({ error: "No workspace access" }, { status: 403 });
  }
  const quota = await getWorkspaceQuota(getDb(), workspaceId);
  return NextResponse.json(quota);
}

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  try {
    await assertRole(getDb(), { workspaceId, userId: user.id, role: "owner" });
    await setWorkspaceQuota(getDb(), workspaceId, body.monthlyLimit);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to set quota" },
      { status: 403 },
    );
  }
}
