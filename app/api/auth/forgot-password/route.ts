import { NextResponse } from "next/server";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/password-reset";
import { enforceRateLimit } from "@/lib/rate-limit";
import { appendAuditEntry } from "@/lib/audit";
import { ForgotPasswordSchema, parseSchema } from "@/lib/schemas";
import { apiError } from "@/lib/api-error";

export async function POST(request: Request) {
  // Tight rate-limit: 3 requests per 10 minutes per IP to prevent email flooding
  const rateLimited = enforceRateLimit("forgot-password", request.headers, { maxRequests: 3, windowMs: 10 * 60 * 1000 });
  if (rateLimited) return rateLimited;

  try {
    const parsed = parseSchema(ForgotPasswordSchema, await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ ok: true }); // never reveal whether email exists
    }
    const { email } = parsed.data;

    // Always return the same success response regardless of whether the email exists —
    // prevents user enumeration attacks.
    const result = await createPasswordResetToken(email);
    if (result) {
      await sendPasswordResetEmail(email, result.token);
      void appendAuditEntry({
        userId: result.userId,
        userName: email,
        userRole: "unknown",
        action: "password_reset_requested",
        entityType: "auth_account",
        entityId: result.userId,
        summary: `Password reset link requested for ${email}`
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Unable to process password reset request.", 500);
  }
}
