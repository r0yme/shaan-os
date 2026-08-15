import { describe, expect, it } from "vitest";
import { formatMinutes, hoursToMinutes } from "@/lib/time";

describe("formatMinutes", () => {
  it("formats whole hours", () => {
    expect(formatMinutes(120)).toBe("2h");
  });

  it("formats minutes only", () => {
    expect(formatMinutes(45)).toBe("45m");
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
  });

  it("formats a single hour", () => {
    expect(formatMinutes(60)).toBe("1h");
  });
});

describe("hoursToMinutes", () => {
  it("converts fractional hours to minutes", () => {
    expect(hoursToMinutes(1.5)).toBe(90);
    expect(hoursToMinutes(0.25)).toBe(15);
    expect(hoursToMinutes(2)).toBe(120);
  });
});
