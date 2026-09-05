import { NextResponse } from "next/server";
import { diffStoryStates, StoryStateSchema } from "@ai-series/story";

export async function POST(request: Request) {
  const body = await request.json();
  const from = StoryStateSchema.parse(body.from ?? {});
  const to = StoryStateSchema.parse(body.to ?? {});
  return NextResponse.json({ diff: diffStoryStates(from, to) });
}
