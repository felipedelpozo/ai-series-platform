import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { assertRole, consumeCredits } from "@ai-series/accounts";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  try {
    await assertRole(getDb(), { workspaceId, userId: user.id, role: "editor" });
    const result = await consumeCredits(getDb(), {
      workspaceId,
      amount: body.amount ?? 1,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "credit consumption denied" },
      { status: 403 },
    );
  }
}
