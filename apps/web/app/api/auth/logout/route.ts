import { NextResponse } from "next/server";
import { getDb } from "@ai-series/db";
import { logout } from "@ai-series/accounts";
import { bearerToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (token) await logout(getDb(), token);
  return NextResponse.json({ ok: true });
}
