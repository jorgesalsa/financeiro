/**
 * In-memory sliding window rate limiter.
 *
 * For MVP/dev usage. In production, replace with a Redis-backed solution
 * (e.g. @upstash/ratelimit) for multi-instance deployments.
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;

  /**
   * Check rate limit for a given key (e.g. userId or tenantId+action).
   *
   * @returns `{ success: true }` if allowed, or throws an error if limit exceeded.
   */
  return function checkRateLimit(key: string): { success: true; remaining: number } {
    const now = Date.now();
    cleanupStaleEntries(windowMs);

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the sliding window
    const cutoff = now - windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`
      );
    }

    entry.timestamps.push(now);
    return { success: true, remaining: maxRequests - entry.timestamps.length };
  };
}

// ──────────────────────────────────────────────────────────
// Pre-configured rate limiters for critical server actions
// ──────────────────────────────────────────────────────────

/** Imports: 10 requests per minute per tenant */
export const importRateLimit = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
});

/** Auto-reconciliation: 20 requests per minute per tenant */
export const reconciliationRateLimit = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 1000,
});

/** Batch incorporation (staging): 5 requests per minute per tenant */
export const stagingBatchRateLimit = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
});

/** General write operations: 60 requests per minute per user */
export const generalWriteRateLimit = createRateLimiter({
  maxRequests: 60,
  windowMs: 60 * 1000,
});
