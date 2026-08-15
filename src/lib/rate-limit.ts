/**
 * Simple in-memory fixed-window rate limiter.
 *
 * Suitable for single-instance development. For production (multi-instance,
 * Phase 11) this must be swapped for a Redis-backed limiter behind the same
 * interface. Do not rely on it across process restarts.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  retryAfterMs: number;
}

export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const existing = store.get(options.key);

  if (!existing || existing.resetAt <= now) {
    store.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return { success: true, retryAfterMs: 0 };
  }

  if (existing.count >= options.limit) {
    return { success: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { success: true, retryAfterMs: 0 };
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
