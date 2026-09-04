import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { acceptInvitation } from "@ai-series/accounts";
import { requireUser } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser(_request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await acceptInvitation(getDb(), { token, userId: user.id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to accept invitation" },
      { status: 400 },
    );
  }
}
