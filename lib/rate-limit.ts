import { NextResponse } from "next/server";
import { consumeRateLimit, type RateLimitPolicy } from "@/lib/rate-limit-core";

function getClientIdentifier(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const userAgent = headers.get("user-agent")?.trim();
  return forwardedFor || realIp || userAgent || "anonymous";
}

export { consumeRateLimit } from "@/lib/rate-limit-core";

export function enforceRateLimit(scope: string, headers: Headers, policy: RateLimitPolicy) {
  const result = consumeRateLimit(scope, getClientIdentifier(headers), policy);

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
