import { NextResponse } from "next/server";
import { renderTemplate } from "@ai-series/prompts";

export async function POST(request: Request) {
  const body = await request.json();
  const result = renderTemplate(
    body.template ?? "",
    body.variables ?? {},
    body.declared ?? [],
  );
  return NextResponse.json(result);
}
