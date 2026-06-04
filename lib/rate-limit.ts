import { NextResponse } from "next/server";
import { consumeRateLimit, type RateLimitPolicy, type RateLimitResult } from "@/lib/rate-limit-core";

// SEC-01: use the durable Firestore-backed limiter when Firestore is the active backend
// (the in-memory limiter does not hold across serverless instances). Falls back to the
// in-memory limiter for local/file-backed dev. Disabled during the Next.js build phase.
const useDurableLimiter =
  process.env.DATA_BACKEND === "firestore" &&
  process.env.NEXT_PHASE !== "phase-production-build";

function getClientIdentifier(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.trim();
  return forwardedFor || realIp || userAgent || "anonymous";
}

export { consumeRateLimit } from "@/lib/rate-limit-core";

export async function enforceRateLimit(scope: string, headers: Headers, policy: RateLimitPolicy) {
  const clientIdentifier = getClientIdentifier(headers);
  let result: RateLimitResult;

  if (useDurableLimiter) {
    try {
      const { consumeRateLimitDurable } = await import("@/lib/rate-limit-store");
      result = await consumeRateLimitDurable(scope, clientIdentifier, policy);
    } catch {
      // Never let a rate-limit backend hiccup take down the endpoint — fail open to the
      // in-memory limiter so legitimate requests still succeed.
      result = consumeRateLimit(scope, clientIdentifier, policy);
    }
  } else {
    result = consumeRateLimit(scope, clientIdentifier, policy);
  }

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests. Please wait and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000))
      }
    }
  );
}
