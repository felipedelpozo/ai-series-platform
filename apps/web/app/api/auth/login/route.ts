import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { loginUser } from "@ai-series/accounts";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await loginUser(getDb(), { email: body.email, password: body.password });
    const response = NextResponse.json(result);
    response.cookies.set(SESSION_COOKIE_NAME, result.token, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "login failed" },
      { status: 401 },
    );
  }
}
