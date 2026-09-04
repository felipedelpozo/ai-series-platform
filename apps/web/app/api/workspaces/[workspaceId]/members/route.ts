import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { assertRole, inviteMember, listMembers } from "@ai-series/accounts";
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
  const members = await listMembers(getDb(), workspaceId);
  return NextResponse.json({ members });
}

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  try {
    await assertRole(getDb(), { workspaceId, userId: user.id, role: "editor" });
    const invitation = await inviteMember(getDb(), {
      workspaceId,
      email: body.email,
      role: body.role ?? "viewer",
      invitedBy: user.id,
    });
    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to invite" },
      { status: 403 },
    );
  }
}
