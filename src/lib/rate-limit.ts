/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for Vercel serverless (short-lived lambda).
 * For production at scale swap to Redis (Upstash-based).
 */

type RateLimitEntry = { tokens: number; lastRefill: number };

const buckets = new Map<string, RateLimitEntry>();

export type RateLimitConfig = {
  /** Maximum tokens (requests) per window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
};

const DEFAULT_CONFIG: RateLimitConfig = { limit: 60, windowSeconds: 60 };

/**
 * Returns { success, remaining, resetIn } or throws nothing.
 * `key` should be a unique identifier like `userId:endpoint`.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry) {
    buckets.set(key, { tokens: config.limit - 1, lastRefill: now });
    return { success: true, remaining: config.limit - 1, resetInSeconds: config.windowSeconds };
  }

  const elapsed = (now - entry.lastRefill) / 1000;
  const refillAmount = Math.floor(elapsed / config.windowSeconds) * config.limit;

  if (refillAmount > 0) {
    entry.tokens = Math.min(config.limit, entry.tokens + refillAmount);
    entry.lastRefill = now;
  }

  if (entry.tokens <= 0) {
    const resetInSeconds = Math.ceil(config.windowSeconds - elapsed);
    return { success: false, remaining: 0, resetInSeconds };
  }

  entry.tokens -= 1;
  return { success: true, remaining: entry.tokens, resetInSeconds: Math.ceil(config.windowSeconds - elapsed) };
}

/**
 * Helper for use in API routes. Returns a 429 Response or null.
 */
export function rateLimitResponse(
  key: string,
  config?: RateLimitConfig,
): Response | null {
  const result = rateLimit(key, config);
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(result.resetInSeconds),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}
