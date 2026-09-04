import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { createWorkspace } from "@ai-series/accounts";
import { requireUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  try {
    const id = await createWorkspace(getDb(), {
      name: body.name,
      slug: body.slug,
      userId: user.id,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to create workspace" },
      { status: 400 },
    );
  }
}
