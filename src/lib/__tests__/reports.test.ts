import { describe, expect, it } from "vitest";
import {
  barPercent,
  buildMonthSeries,
  monthKey,
  sinceForRange,
  sumByMonth,
  toCsv,
} from "@/lib/reports";

describe("monthKey", () => {
  it("formats a date as YYYY-MM", () => {
    expect(monthKey(new Date(2026, 7, 15))).toBe("2026-08");
  });
});

describe("buildMonthSeries", () => {
  it("builds one bucket per month inclusive", () => {
    const series = buildMonthSeries(new Date(2026, 7, 1), new Date(2026, 9, 30));
    expect(series.map((b) => b.key)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("respects the bucket cap", () => {
    const series = buildMonthSeries(new Date(2020, 0, 1), new Date(2026, 0, 1), 12);
    expect(series.length).toBe(12);
  });
});

describe("sumByMonth", () => {
  it("aggregates amounts into the matching buckets", () => {
    const buckets = [
      { key: "2026-07", label: "Jul 26" },
      { key: "2026-08", label: "Aug 26" },
    ];
    const totals = sumByMonth(
      [
        { date: new Date(2026, 7, 2), amount: 100 },
        { date: new Date(2026, 7, 20), amount: 250 },
        { date: new Date(2026, 5, 10), amount: 999 },
      ],
      buckets,
    );
    expect(totals).toEqual([0, 350]);
  });
});

describe("sinceForRange", () => {
  it("returns null for all-time and unknown ranges", () => {
    expect(sinceForRange("all")).toBeNull();
    expect(sinceForRange(undefined)).toBeNull();
    expect(sinceForRange("bogus")).toBeNull();
  });

  it("subtracts the requested number of days", () => {
    const now = new Date(2026, 7, 15, 14, 30);
    const since = sinceForRange("30", now);
    expect(since?.getDate()).toBe(16);
    expect(since?.getMonth()).toBe(6);
    expect(since?.getHours()).toBe(0);
  });
});

describe("barPercent", () => {
  it("clamps to the 0-100 range", () => {
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(150, 100)).toBe(100);
    expect(barPercent(-5, 100)).toBe(0);
    expect(barPercent(10, 0)).toBe(0);
  });
});

describe("toCsv", () => {
  it("escapes commas, quotes and newlines", () => {
    const csv = toCsv(["name", "note"], [["Dane, LLC", 'he said "hi"']]);
    expect(csv).toContain('"Dane, LLC"');
    expect(csv).toContain('"he said ""hi"""');
  });
});
