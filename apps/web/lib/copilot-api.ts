import { randomUUID } from "node:crypto";
import { canRole, getWorkspaceRole, type PublicUser, type Role } from "@ai-series/accounts";
import { getDb, schema, type Db } from "@ai-series/db";
import { lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requestAuth, requireUser } from "./auth";

const { copilotRateLimitBuckets } = schema;

export const DEFAULT_JSON_LIMIT_BYTES = 64 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const OPERATION_PATTERN = /^[a-z][a-z0-9._:-]{0,63}$/;

export class CopilotApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CopilotApiError";
  }
}

export interface CopilotAuthorization {
  user: PublicUser;
  workspaceId: string;
  role: Role;
}

export interface AuthorizeCopilotOptions {
  workspaceId: string;
  requiredRole?: Role;
  mutation?: boolean;
  db?: Db;
}

export interface RateLimitReservation {
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface ReserveRateLimitInput {
  workspaceId: string;
  actorUserId: string;
  operation: string;
  limit: number;
  windowMs: number;
  now?: Date;
}

function normalizedHost(value: string): string | null {
  try {
    return new URL(`http://${value}`).host.toLowerCase();
  } catch {
    return null;
  }
}

export function correlationIdForRequest(request: Request): string {
  const supplied = request.headers.get("x-correlation-id")?.trim();
  return supplied && CORRELATION_ID_PATTERN.test(supplied) ? supplied : randomUUID();
}

export function assertCopilotMutationOrigin(request: Request): void {
  if (requestAuth(request)?.source !== "cookie") return;

  const originValue = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!originValue || !host) {
    throw new CopilotApiError(403, "invalid_origin", "Request origin is not allowed");
  }

  let origin: URL;
  try {
    origin = new URL(originValue);
  } catch {
    throw new CopilotApiError(403, "invalid_origin", "Request origin is not allowed");
  }

  const requestUrl = new URL(request.url);
  const expectedHost = normalizedHost(host);
  if (
    originValue !== origin.origin ||
    !expectedHost ||
    origin.host.toLowerCase() !== expectedHost ||
    origin.protocol !== requestUrl.protocol
  ) {
    throw new CopilotApiError(403, "invalid_origin", "Request origin is not allowed");
  }
}

export async function authorizeCopilotRequest(
  request: Request,
  options: AuthorizeCopilotOptions,
): Promise<CopilotAuthorization> {
  if (options.mutation) assertCopilotMutationOrigin(request);

  const db = options.db ?? getDb();
  const user = await requireUser(request, db);
  if (!user) throw new CopilotApiError(401, "unauthenticated", "Authentication required");

  const role = await getWorkspaceRole(db, options.workspaceId, user.id);
  if (!role) {
    throw new CopilotApiError(404, "workspace_not_found", "Workspace not found");
  }
  if (!canRole(role, options.requiredRole ?? "viewer")) {
    throw new CopilotApiError(403, "forbidden", "Workspace access denied");
  }
  return { user, workspaceId: options.workspaceId, role };
}

export async function readBoundedJson<T>(
  request: Request,
  maxBytes = DEFAULT_JSON_LIMIT_BYTES,
): Promise<T> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new CopilotApiError(415, "unsupported_media_type", "Expected application/json");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("maxBytes must be a positive safe integer");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maxBytes) {
      throw new CopilotApiError(413, "payload_too_large", "Request body is too large");
    }
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new CopilotApiError(413, "payload_too_large", "Request body is too large");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CopilotApiError(400, "invalid_json", "Request body is not valid JSON");
  }
}

export function copilotJson<T extends Record<string, unknown>>(
  data: T,
  correlationId: string,
  status = 200,
) {
  return NextResponse.json({ ...data, correlationId }, { status });
}

export function copilotErrorResponse(error: unknown, correlationId: string) {
  if (error instanceof CopilotApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message }, correlationId },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: { code: "internal_error", message: "The request could not be completed" },
      correlationId,
    },
    { status: 500 },
  );
}

export async function reserveCopilotRateLimit(
  db: Db,
  input: ReserveRateLimitInput,
): Promise<RateLimitReservation> {
  if (!OPERATION_PATTERN.test(input.operation)) throw new Error("Invalid rate-limit operation");
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 1_000_000)
    throw new Error("Invalid rate limit");
  if (
    !Number.isSafeInteger(input.windowMs) ||
    input.windowMs < 1_000 ||
    input.windowMs > 24 * 60 * 60 * 1_000
  )
    throw new Error("Invalid rate-limit window");

  const now = input.now ?? new Date();
  const windowStartedAt = new Date(Math.floor(now.getTime() / input.windowMs) * input.windowMs);
  const expiresAt = new Date(windowStartedAt.getTime() + input.windowMs);
  const [bucket] = await db
    .insert(copilotRateLimitBuckets)
    .values({
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      operation: input.operation,
      windowStartedAt,
      count: 1,
      limit: input.limit,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        copilotRateLimitBuckets.workspaceId,
        copilotRateLimitBuckets.actorUserId,
        copilotRateLimitBuckets.operation,
        copilotRateLimitBuckets.windowStartedAt,
      ],
      set: {
        count: sql`${copilotRateLimitBuckets.count} + 1`,
        updatedAt: now,
      },
      where: lt(copilotRateLimitBuckets.count, copilotRateLimitBuckets.limit),
    })
    .returning({ count: copilotRateLimitBuckets.count, limit: copilotRateLimitBuckets.limit });

  if (!bucket) throw new CopilotApiError(429, "rate_limited", "Too many requests");
  return {
    count: bucket.count,
    limit: bucket.limit,
    remaining: bucket.limit - bucket.count,
    resetAt: expiresAt,
  };
}
