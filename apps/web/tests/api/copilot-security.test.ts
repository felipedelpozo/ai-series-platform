import { describe, expect, it } from "bun:test";
import type { Db } from "@ai-series/db";
import { cookieToken, requestAuth, sessionCookieOptions } from "../../lib/auth";
import {
  CopilotApiError,
  assertCopilotMutationOrigin,
  copilotErrorResponse,
  correlationIdForRequest,
  readBoundedJson,
  reserveCopilotRateLimit,
} from "../../lib/copilot-api";

function request(
  url = "https://studio.example.test/api/copilot/conversations",
  init: RequestInit = {},
) {
  return new Request(url, init);
}

describe("copilot session transport", () => {
  it("uses the HttpOnly production cookie and keeps Bearer as fallback", () => {
    expect(sessionCookieOptions(true)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    const bearer = request(undefined, { headers: { authorization: "Bearer api-token" } });
    expect(requestAuth(bearer)).toEqual({ source: "bearer", token: "api-token" });

    const cookie = request(undefined, {
      headers: {
        authorization: "Bearer api-token",
        cookie: "unrelated=x; ai_series_session=cookie-token",
      },
    });
    expect(cookieToken(cookie)).toBe("cookie-token");
    expect(requestAuth(cookie)).toEqual({ source: "cookie", token: "cookie-token" });
  });

  it("rejects malformed encoded session cookies", () => {
    const malformed = request(undefined, { headers: { cookie: "ai_series_session=%ZZ" } });
    expect(cookieToken(malformed)).toBeNull();
  });
});

describe("cookie mutation origin", () => {
  it("accepts an exact Origin, protocol and Host match", () => {
    const sameOrigin = request(undefined, {
      method: "POST",
      headers: {
        cookie: "ai_series_session=session",
        host: "studio.example.test",
        origin: "https://studio.example.test",
      },
    });
    expect(() => assertCopilotMutationOrigin(sameOrigin)).not.toThrow();
  });

  it("rejects missing, foreign, path-bearing and protocol-mismatched origins", () => {
    const headers = { cookie: "ai_series_session=session", host: "studio.example.test" };
    const origins = [
      undefined,
      "https://evil.example.test",
      "https://studio.example.test/path",
      "http://studio.example.test",
    ];
    for (const origin of origins) {
      const mutation = request(undefined, {
        method: "POST",
        headers: origin ? { ...headers, origin } : headers,
      });
      expect(() => assertCopilotMutationOrigin(mutation)).toThrow(CopilotApiError);
    }
  });

  it("does not apply ambient-cookie CSRF checks to Bearer-only clients", () => {
    const bearer = request(undefined, {
      method: "POST",
      headers: { authorization: "Bearer api-token", origin: "https://client.example.test" },
    });
    expect(() => assertCopilotMutationOrigin(bearer)).not.toThrow();
  });
});

describe("bounded inputs and safe errors", () => {
  it("parses JSON within the byte bound", async () => {
    const body = request(undefined, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "hola" }),
    });
    expect(await readBoundedJson<{ content: string }>(body, 64)).toEqual({ content: "hola" });
  });

  it("rejects an oversized body even without Content-Length", async () => {
    const body = request(undefined, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "é".repeat(40) }),
    });
    await expect(readBoundedJson(body, 64)).rejects.toMatchObject({
      status: 413,
      code: "payload_too_large",
    });
  });

  it("redacts unknown errors and untrusted correlation identifiers", async () => {
    const correlationId = correlationIdForRequest(
      request(undefined, { headers: { "x-correlation-id": "secret header" } }),
    );
    expect(correlationId).not.toContain("secret");

    const response = copilotErrorResponse(new Error("DATABASE_URL=top-secret"), correlationId);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("top-secret");
    expect(text).toContain("internal_error");
  });
});

describe("durable rate limit reservation", () => {
  function fakeDb(returned: Array<{ count: number; limit: number }>) {
    const observed: { values?: Record<string, unknown>; conflict?: Record<string, unknown> } = {};
    const chain = {
      values(values: Record<string, unknown>) {
        observed.values = values;
        return chain;
      },
      onConflictDoUpdate(conflict: Record<string, unknown>) {
        observed.conflict = conflict;
        return chain;
      },
      async returning() {
        return returned;
      },
    };
    return {
      db: { insert: () => chain } as unknown as Db,
      observed,
    };
  }

  it("reserves one fixed-window bucket scoped by workspace, actor and operation", async () => {
    const { db, observed } = fakeDb([{ count: 2, limit: 5 }]);
    const result = await reserveCopilotRateLimit(db, {
      workspaceId: "79fcb06d-9bb9-4fb9-9e6d-f8183140a635",
      actorUserId: "9712adee-1331-4226-a466-fe57101e4853",
      operation: "message.generate",
      limit: 5,
      windowMs: 60_000,
      now: new Date("2026-09-05T10:00:30.000Z"),
    });

    expect(observed.values).toMatchObject({
      workspaceId: "79fcb06d-9bb9-4fb9-9e6d-f8183140a635",
      actorUserId: "9712adee-1331-4226-a466-fe57101e4853",
      operation: "message.generate",
      count: 1,
      limit: 5,
      windowStartedAt: new Date("2026-09-05T10:00:00.000Z"),
    });
    expect(observed.conflict).toBeDefined();
    expect(result).toEqual({
      count: 2,
      limit: 5,
      remaining: 3,
      resetAt: new Date("2026-09-05T10:01:00.000Z"),
    });
  });

  it("returns a typed 429 when the atomic increment cannot reserve capacity", async () => {
    const { db } = fakeDb([]);
    await expect(
      reserveCopilotRateLimit(db, {
        workspaceId: "79fcb06d-9bb9-4fb9-9e6d-f8183140a635",
        actorUserId: "9712adee-1331-4226-a466-fe57101e4853",
        operation: "proposal.apply",
        limit: 1,
        windowMs: 60_000,
      }),
    ).rejects.toMatchObject({ status: 429, code: "rate_limited" });
  });
});
