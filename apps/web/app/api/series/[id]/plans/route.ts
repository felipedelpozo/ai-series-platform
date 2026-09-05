import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@ai-series/db";
import { generateEpisodePlan, listEpisodePlans } from "@ai-series/planner";
import { readOptionalJsonBody } from "@/lib/request-body";

const GeneratePlanInputSchema = z.object({
  episodeNumber: z.coerce.number().int().min(1).optional(),
  audienceDecision: z.string().optional(),
  details: z
    .string()
    .trim()
    .max(4000, "Episode details must be 4000 characters or less")
    .optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plans = await listEpisodePlans(getDb(), id);
  return NextResponse.json({ plans });
}

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
  const input = GeneratePlanInputSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message }, { status: 400 });
  }
  try {
    const planId = await generateEpisodePlan(getDb(), {
      seriesId: id,
      episodeNumber: input.data.episodeNumber ?? 1,
      audienceDecision: input.data.audienceDecision,
      details: input.data.details,
    });
    return NextResponse.json({ id: planId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "generation failed" },
      { status: 400 },
    );
  }
}
