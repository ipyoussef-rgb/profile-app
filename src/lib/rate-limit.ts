// Simple in-memory token bucket per (key, window). Good enough for demo /
// single-instance deployments. For multi-instance production, swap for Redis
// or Vercel KV. Each Vercel serverless instance has its own memory, so this
// is best-effort on serverless — adequate for the demo Profile flows.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, max: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true };
  }
  if (b.count < max) {
    b.count += 1;
    return { ok: true };
  }
  return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
}
