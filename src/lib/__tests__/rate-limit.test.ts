import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimit, rateLimit } from "@/lib/rate-limit";

const KEY = "test-key";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  clearRateLimit(KEY);
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const limit = 3;
    for (let i = 0; i < limit; i++) {
      const result = rateLimit({ key: KEY, limit, windowMs: 60_000 });
      expect(result.success).toBe(true);
    }
  });

  it("blocks requests beyond the limit", () => {
    const limit = 2;
    rateLimit({ key: KEY, limit, windowMs: 60_000 });
    rateLimit({ key: KEY, limit, windowMs: 60_000 });
    const blocked = rateLimit({ key: KEY, limit, windowMs: 60_000 });
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets the window after the window elapses", () => {
    const limit = 1;
    rateLimit({ key: KEY, limit, windowMs: 60_000 });
    expect(rateLimit({ key: KEY, limit, windowMs: 60_000 }).success).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(rateLimit({ key: KEY, limit, windowMs: 60_000 }).success).toBe(true);
  });

  it("treats different keys independently", () => {
    rateLimit({ key: KEY, limit: 1, windowMs: 60_000 });
    expect(rateLimit({ key: "other-key", limit: 1, windowMs: 60_000 }).success).toBe(true);
  });
});
