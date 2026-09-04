import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { listWorkflows, registerWorkflow } from "@ai-series/comfy";

export async function GET() {
  const workflows = await listWorkflows(getDb());
  return NextResponse.json({ workflows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = await registerWorkflow(getDb(), {
    name: body.name,
    version: body.version,
    params: body.params ?? {},
  });
  return NextResponse.json({ id }, { status: 201 });
}
