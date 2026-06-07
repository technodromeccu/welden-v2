import { NextResponse } from "next/server";
import { handleAdvisorChat } from "@/lib/advisor";
import { enforceRateLimit } from "@/lib/rate-limit";
import { validateAdvisorRequest } from "@/lib/request-validation";
import { apiError } from "@/lib/api-error";
import type { PublicAdvisorResponse } from "@/lib/types";

// This route runs two sequential Gemini calls plus brochure-PDF grounding, so it can take
// ~15-20s. Raise the serverless function timeout. Netlify honors Next's maxDuration up to
// the plan's maximum (26s); on the free tier functions are still capped at 10s.
export const maxDuration = 26;

// SEC-01: Validate that the request origin matches the configured site URL.
// Blocks cross-domain abuse where external scripts POST fake leads from arbitrary domains.
// In development mode all origins are allowed so localhost tooling keeps working.
function isAllowedOrigin(request: Request): boolean {
  if (process.env.NODE_ENV === "development") return true;

  const origin = request.headers.get("origin");
  // No Origin header means same-origin (server-to-server or direct browser nav) — allow.
  if (!origin) return true;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!siteUrl) {
    // If NEXT_PUBLIC_SITE_URL is not configured, fall back to permissive (logs a warning).
    console.warn("[advisor] NEXT_PUBLIC_SITE_URL not set — skipping origin check.");
    return true;
  }

  // Also allow the Netlify deploy URL (URL env var is set automatically by Netlify).
  // This means the chatbot works on both the .netlify.app preview and the custom domain
  // without needing to update NEXT_PUBLIC_SITE_URL when switching domains.
  const netlifyUrl = (process.env.URL ?? "").replace(/\/$/, "");
  const netlifyDeployUrl = (process.env.DEPLOY_URL ?? "").replace(/\/$/, "");

  return origin === siteUrl ||
    (Boolean(netlifyUrl) && origin === netlifyUrl) ||
    (Boolean(netlifyDeployUrl) && origin === netlifyDeployUrl);
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const rateLimited = await enforceRateLimit("advisor-recommend", request.headers, { maxRequests: 15, windowMs: 5 * 60 * 1000 });
    if (rateLimited) {
      return rateLimited;
    }

    const body = validateAdvisorRequest(await request.json() as {
      lead?: {
        name?: string;
        email?: string;
        phone?: string;
        company?: string;
      };
      question?: string;
      transcriptSummary?: string;
    });

    const result = await handleAdvisorChat({
      lead: body.lead,
      question: body.question,
      transcriptSummary: body.transcriptSummary
    });

    return NextResponse.json(result satisfies PublicAdvisorResponse);
  } catch (error) {
    // 400-level errors (validation failures) intentionally expose the message so the
    // client can display it. Internal errors use the generic fallback via apiError.
    if (error instanceof Error && !error.message.includes("ENOENT") && !error.message.includes("EACCES")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error, "Unable to process advisor request.", 500);
  }
}


