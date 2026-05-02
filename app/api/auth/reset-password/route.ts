import { NextResponse } from "next/server";
import { validatePasswordResetToken, consumePasswordResetToken } from "@/lib/password-reset";
import { enforceRateLimit } from "@/lib/rate-limit";
import { ResetPasswordSchema, parseSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";

// GET — validate a token before showing the reset form (so we can show an error page early)
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ valid: false, error: "Token is required." }, { status: 400 });
  }

  const result = await validatePasswordResetToken(token);
  if (!result) {
    return NextResponse.json({ valid: false, error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  return NextResponse.json({ valid: true });
}

// POST — consume token and update password
export async function POST(request: Request) {
  const rateLimited = enforceRateLimit("reset-password", request.headers, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
  if (rateLimited) return rateLimited;

  try {
    const parsed = parseSchema(ResetPasswordSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { token, password } = parsed.data;

    const ok = await consumePasswordResetToken(token, password);
    if (!ok) {
      return NextResponse.json({ error: "This reset link is invalid or has already been used." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to reset password.", 500);
  }
}
