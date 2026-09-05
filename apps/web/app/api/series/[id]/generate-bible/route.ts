import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@ai-series/db";
import { generateBibleProposal } from "@ai-series/series";
import { readOptionalJsonBody } from "@/lib/request-body";

const GenerateBibleInputSchema = z.object({
  details: z.string().trim().max(4000, "Series details must be 4000 characters or less").optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await readOptionalJsonBody(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid JSON body" },
      { status: 400 },
    );
  }
  const input = GenerateBibleInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const bibleId = await generateBibleProposal(getDb(), id, input.data);
    return NextResponse.json({ id: bibleId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
