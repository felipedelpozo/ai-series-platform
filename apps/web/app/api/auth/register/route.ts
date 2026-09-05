import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { registerUser } from "@ai-series/accounts";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const user = await registerUser(getDb(), {
      email: body.email,
      password: body.password,
      name: body.name,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "registration failed" },
      { status: 400 },
    );
  }
}
