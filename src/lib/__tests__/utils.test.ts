import { describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "@/lib/utils";

describe("formatRelativeTime", () => {
  it("renders seconds as 'just now'", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5_000))).toBe("just now");
  });

  it("renders minutes", () => {
    expect(formatRelativeTime(new Date(Date.now() - 10 * 60_000))).toBe("10m ago");
  });

  it("renders hours", () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000))).toBe("3h ago");
  });

  it("renders days", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86_400_000))).toBe("2d ago");
  });

  it("renders an absolute date beyond a week", () => {
    vi.setSystemTime(new Date(2026, 7, 15));
    const older = new Date(2026, 6, 20).toISOString();
    expect(formatRelativeTime(older)).toBe("Jul 20");
    vi.useRealTimers();
  });
});
