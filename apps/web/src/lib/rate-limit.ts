/**
 * Simple in-memory rate limiter using a sliding window.
 *
 * NOTE: On Vercel serverless each function instance has its own memory, so this
 * counter is NOT shared across concurrent instances. For the current traffic
 * volumes this is acceptable — a user hitting multiple instances simultaneously
 * would exceed the limit only within a single instance. A Redis-backed solution
 * (e.g., Upstash) should replace this if coordinated enforcement is required.
 */

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

interface TokenRecord {
  timestamps: number[];
}

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number;
  /** Max unique tokens to track before evicting the oldest entry */
  uniqueTokenPerInterval: number;
}

/**
 * Creates a rate limiter instance.
 *
 * Returns an object with:
 * - `check(limit, token)` — throws if over limit (legacy API, used by existing routes)
 * - `consume(identifier, limit, windowMs)` — returns RateLimitResult (new API)
 */
export function rateLimit(options: RateLimitOptions) {
  const tokenMap = new Map<string, TokenRecord>();

  function _consume(token: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Evict the oldest tracked token when the map is full to bound memory usage
    if (tokenMap.size >= options.uniqueTokenPerInterval && !tokenMap.has(token)) {
      const oldest = tokenMap.keys().next().value;
      if (oldest !== undefined) tokenMap.delete(oldest);
    }

    const record = tokenMap.get(token) ?? { timestamps: [] };

    // Drop timestamps outside the current sliding window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    const resetAt = record.timestamps.length > 0 ? record.timestamps[0]! + windowMs : now + windowMs;

    if (record.timestamps.length >= limit) {
      tokenMap.set(token, record);
      return { success: false, remaining: 0, resetAt };
    }

    record.timestamps.push(now);
    tokenMap.set(token, record);

    return {
      success: true,
      remaining: limit - record.timestamps.length,
      resetAt,
    };
  }

  return {
    /**
     * Sliding-window check. Throws `Error("Rate limit exceeded")` when over limit.
     * Kept for backward-compatibility with existing route handlers.
     */
    check(limit: number, token: string): Promise<void> {
      return new Promise((resolve, reject) => {
        const result = _consume(token, limit, options.interval);
        if (result.success) {
          resolve();
        } else {
          reject(new Error("Rate limit exceeded"));
        }
      });
    },

    /**
     * Sliding-window check. Returns a result object instead of throwing.
     * Preferred for new code — makes it easy to set Retry-After headers.
     */
    consume(identifier: string, limit: number, windowMs: number): RateLimitResult {
      return _consume(identifier, limit, windowMs);
    },
  };
}

// ---------------------------------------------------------------------------
// Named limiters for each API surface
// ---------------------------------------------------------------------------

/** Estimate email send — 5 per minute per authenticated user */
export const sendEstimateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

/** Team invite — 10 per hour per authenticated user */
export const inviteLimiter = rateLimit({
  interval: 60 * 60_000, // 1 hour
  uniqueTokenPerInterval: 200,
});

/** Portal signature submission — 5 per minute per IP */
export const portalSignLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

/** AI call-to-estimate processing — 10 per minute per authenticated user */
export const callToEstimateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

/**
 * General-purpose estimate API limiter (used by share, payment-link, change-orders, etc.)
 * 10 requests per minute per user.
 */
export const estimateApiLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});
