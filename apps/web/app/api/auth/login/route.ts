import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { loginUser } from "@ai-series/accounts";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await loginUser(getDb(), { email: body.email, password: body.password });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "login failed" },
      { status: 401 },
    );
  }
}
