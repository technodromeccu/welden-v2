import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/origin-check";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
