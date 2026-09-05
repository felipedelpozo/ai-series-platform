import { getDb, type Db } from "@ai-series/db";
import { getSessionUser } from "@ai-series/accounts";

export const SESSION_COOKIE_NAME = "ai_series_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export interface RequestAuth {
  source: "cookie" | "bearer";
  token: string;
}

function normalizedSessionToken(value: string): string | null {
  const token = value.trim();
  return token.length > 0 && token.length <= 256 && /^[\x21-\x7e]+$/.test(token) ? token : null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return normalizedSessionToken(header.slice("Bearer ".length));
}

export function cookieToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return null;
    try {
      return normalizedSessionToken(decodeURIComponent(value));
    } catch {
      return null;
    }
  }

  return null;
}

export function requestAuth(request: Request): RequestAuth | null {
  const cookie = cookieToken(request);
  if (cookie) return { source: "cookie", token: cookie };

  const bearer = bearerToken(request);
  return bearer ? { source: "bearer", token: bearer } : null;
}

export function sessionCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function expiredSessionCookieOptions(isProduction = process.env.NODE_ENV === "production") {
  return {
    ...sessionCookieOptions(isProduction),
    maxAge: 0,
    expires: new Date(0),
  };
}

export async function requireUser(request: Request, db: Db = getDb()) {
  return getSessionUser(db, requestAuth(request)?.token);
}
