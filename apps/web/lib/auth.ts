import { getDb } from "@ai-series/db";
import { getSessionUser } from "@ai-series/accounts";

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function requireUser(request: Request) {
  return getSessionUser(getDb(), bearerToken(request));
}
