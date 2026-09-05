import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, workspace } from "@ai-series/db";
import { linkAccount } from "@ai-series/tiktok";

export async function POST(request: Request) {
  const body = await request.json();
  const [defaultWorkspace] = await getDb()
    .select({ id: workspace.id })
    .from(workspace)
    .where(eq(workspace.slug, "default"));
  if (!defaultWorkspace) {
    return NextResponse.json({ error: "Default workspace not found" }, { status: 400 });
  }
  const result = await linkAccount(getDb(), {
    workspaceId: defaultWorkspace.id,
    platformUsername: body.platformUsername,
    providerAccountId: body.providerAccountId,
  });
  return NextResponse.json(result);
}
