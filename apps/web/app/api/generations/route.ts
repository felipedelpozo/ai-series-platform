import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { resolveWorkspaceId } from "@ai-series/generation";
import { enqueueActiveJob, listJobs } from "@ai-series/jobs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filters = {
    kind: url.searchParams.get("kind") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  };
  const jobs = await listJobs(getDb(), filters);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const db = getDb();
    const workspaceId = await resolveWorkspaceId(db);
    const kind = body.type === "video" ? "video" : "image";
    const input = {
      templateId: body.templateId,
      versionId: body.versionId,
      variables: body.variables ?? {},
      params: body.params ?? {},
      sourceAssetId: body.sourceAssetId,
      model: body.model,
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ workspaceId, kind, input }))
      .digest("hex");
    const scope = `generation-lab:${fingerprint}`;
    const attemptToken =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.length <= 128
        ? body.idempotencyKey
        : randomUUID();
    const idempotencyKey = `${scope}:${attemptToken}`;
    const { id, created } = await enqueueActiveJob(
      db,
      {
        workspaceId,
        idempotencyKey,
        kind,
        model: body.model,
        input,
      },
      scope,
    );
    return NextResponse.json(
      { jobId: id, idempotencyKey, created },
      { status: created ? 201 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to enqueue job" },
      { status: 400 },
    );
  }
}
