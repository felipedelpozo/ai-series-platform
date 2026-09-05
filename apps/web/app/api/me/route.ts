import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listWorkspacesForUser } from "@ai-series/accounts";
import { requireUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaces = await listWorkspacesForUser(getDb(), user.id);
  return NextResponse.json({ user, workspaces });
}
