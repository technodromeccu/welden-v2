export type RateLimitPolicy = {
  maxRequests: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

declare global {
  var __weldenRateLimitBuckets: Map<string, RateLimitBucket> | undefined;
}

const buckets = globalThis.__weldenRateLimitBuckets ?? new Map<string, RateLimitBucket>();

if (!globalThis.__weldenRateLimitBuckets) {
  globalThis.__weldenRateLimitBuckets = buckets;
}

export function consumeRateLimit(scope: string, clientIdentifier: string, policy: RateLimitPolicy, now = Date.now()): RateLimitResult {
  const key = `${scope}:${clientIdentifier}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + policy.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: Math.max(policy.maxRequests - 1, 0),
      retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      resetAt
    };
  }

  if (current.count >= policy.maxRequests) {
    return {
      allowed: false,
      limit: policy.maxRequests,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
      resetAt: current.resetAt
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    allowed: true,
    limit: policy.maxRequests,
    remaining: Math.max(policy.maxRequests - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    resetAt: current.resetAt
  };
}
