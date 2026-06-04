import { createHash } from "node:crypto";
import type { RateLimitPolicy, RateLimitResult } from "@/lib/rate-limit-core";

// SEC-01: durable, cross-instance rate limiting backed by Firestore.
//
// The in-memory limiter in rate-limit-core.ts only counts within a single process,
// which does not hold on serverless/edge runtimes (each invocation can be a fresh
// instance), so the public advisor + auth endpoints were effectively unthrottled in
// production. This implementation uses an atomic Firestore transaction so the limit is
// enforced globally. Documents carry an `expireAt` timestamp; a Firestore TTL policy on
// that field auto-deletes stale buckets so this collection never accumulates.

const RATE_LIMIT_COLLECTION = "rate-limits";

function bucketId(scope: string, clientIdentifier: string): string {
  // Hash the identifier (which can be an IP or UA) so it is not stored in the clear
  // and is always a valid Firestore document id.
  return createHash("sha1").update(`${scope}:${clientIdentifier}`).digest("hex");
}

export async function consumeRateLimitDurable(
  scope: string,
  clientIdentifier: string,
  policy: RateLimitPolicy,
  now = Date.now()
): Promise<RateLimitResult> {
  const { getFirestoreDb } = await import("./firebase-admin");
  const db = await getFirestoreDb();
  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(bucketId(scope, clientIdentifier));

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const current = snapshot.exists
      ? (snapshot.data() as { count: number; resetAt: number })
      : null;

    // Fresh window: no bucket yet, or the previous window has expired.
    if (!current || current.resetAt <= now) {
      const resetAt = now + policy.windowMs;
      tx.set(ref, { count: 1, resetAt, expireAt: new Date(resetAt) });
      return {
        allowed: true,
        limit: policy.maxRequests,
        remaining: Math.max(policy.maxRequests - 1, 0),
        retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
        resetAt
      };
    }

    // Window active and limit already reached: deny.
    if (current.count >= policy.maxRequests) {
      return {
        allowed: false,
        limit: policy.maxRequests,
        remaining: 0,
        retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
        resetAt: current.resetAt
      };
    }

    // Window active and under the limit: increment.
    const count = current.count + 1;
    tx.update(ref, { count });
    return {
      allowed: true,
      limit: policy.maxRequests,
      remaining: Math.max(policy.maxRequests - count, 0),
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
      resetAt: current.resetAt
    };
  });
}
