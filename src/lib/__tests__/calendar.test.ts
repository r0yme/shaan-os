import { describe, expect, it } from "vitest";
import {
  monthKey,
  parseMonthKey,
  monthStart,
  monthEnd,
  monthLabel,
  shiftMonth,
  isInMonth,
  weekGrid,
  formatEventTime,
} from "@/lib/calendar";

describe("monthKey and parseMonthKey", () => {
  it("round-trips a date to a key and back", () => {
    const date = new Date(2026, 7, 15);
    const key = monthKey(date);
    expect(key).toBe("2026-08");
    expect(parseMonthKey(key)).toEqual({ year: 2026, month: 7 });
  });
});

describe("monthStart and monthEnd", () => {
  it("returns the first and last day of the month", () => {
    const start = monthStart("2026-08");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);

    const end = monthEnd("2026-08");
    expect(end.getDate()).toBe(31);
  });

  it("handles a leap February", () => {
    expect(monthEnd("2024-02").getDate()).toBe(29);
    expect(monthEnd("2026-02").getDate()).toBe(28);
  });
});

describe("monthLabel", () => {
  it("formats a readable label", () => {
    expect(monthLabel("2026-08")).toBe("August 2026");
  });
});

describe("shiftMonth", () => {
  it("rolls over across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("isInMonth", () => {
  it("distinguishes in-month and padded days", () => {
    expect(isInMonth("2026-08", new Date(2026, 7, 15))).toBe(true);
    expect(isInMonth("2026-08", new Date(2026, 6, 31))).toBe(false);
  });
});

describe("weekGrid", () => {
  it("starts every week on a Monday and covers the whole month", () => {
    const weeks = weekGrid("2026-08");
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    for (const week of weeks) {
      expect(week[0].getDay()).toBe(1);
    }
    const flat = weeks.flat();
    expect(flat.some((d) => d.getDate() === 1 && d.getMonth() === 7)).toBe(true);
    expect(flat.some((d) => d.getDate() === 31 && d.getMonth() === 7)).toBe(true);
  });
});

describe("formatEventTime", () => {
  it("shows all-day events", () => {
    expect(formatEventTime(new Date(2026, 7, 20, 9), new Date(2026, 7, 20, 17), true)).toBe(
      "All day",
    );
  });

  it("formats a timed range", () => {
    const text = formatEventTime(
      new Date(2026, 7, 20, 10, 0),
      new Date(2026, 7, 20, 11, 30),
      false,
    );
    expect(text).toMatch(/^10:00 AM – 11:30 AM$/);
  });
});
