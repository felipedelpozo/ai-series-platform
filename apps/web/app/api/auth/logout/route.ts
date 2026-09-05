import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { logout } from "@ai-series/accounts";
import { expiredSessionCookieOptions, requestAuth, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  assertCopilotMutationOrigin,
  copilotErrorResponse,
  correlationIdForRequest,
} from "@/lib/copilot-api";

export async function POST(request: Request) {
  const correlationId = correlationIdForRequest(request);
  try {
    assertCopilotMutationOrigin(request);
    const auth = requestAuth(request);
    if (auth) await logout(getDb(), auth.token);
    const response = NextResponse.json({ ok: true, correlationId });
    response.cookies.set(SESSION_COOKIE_NAME, "", expiredSessionCookieOptions());
    return response;
  } catch (error) {
    return copilotErrorResponse(error, correlationId);
  }
}
