import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@ai-series/db";
import { generateEntityProposal } from "@ai-series/entities";

const GenerateEntityInputSchema = z.object({
  details: z.string().trim().max(4000, "Entity details must be 4000 characters or less").optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const input = GenerateEntityInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const versionId = await generateEntityProposal(getDb(), id, input.data);
    return NextResponse.json({ versionId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
