import { describe, expect, it } from "vitest";
import { countUnread, latestMessagePreview } from "@/lib/messages";

function msg(senderKind: string, at: string): { senderKind: string; createdAt: Date } {
  return { senderKind, createdAt: new Date(at) };
}

describe("countUnread", () => {
  const messages = [
    msg("USER", "2026-08-01T10:00:00Z"),
    msg("CLIENT", "2026-08-02T10:00:00Z"),
    msg("USER", "2026-08-03T10:00:00Z"),
    msg("CLIENT", "2026-08-04T10:00:00Z"),
  ];

  it("counts only messages from the other side after the read marker", () => {
    expect(countUnread(messages, new Date("2026-08-03T10:00:00Z"), "USER")).toBe(1);
  });

  it("ignores messages from the viewer's own side", () => {
    expect(countUnread(messages, null, "USER")).toBe(2);
    expect(countUnread(messages, null, "CLIENT")).toBe(2);
  });

  it("counts everything incoming when never read", () => {
    expect(countUnread(messages, null, "CLIENT")).toBe(2);
  });
});

describe("latestMessagePreview", () => {
  it("returns a truncated, single-line preview", () => {
    const preview = latestMessagePreview([
      { body: "A very long line ".repeat(20), createdAt: new Date(), senderKind: "CLIENT" },
    ]);
    expect(preview?.preview.endsWith("…")).toBe(true);
    expect(preview?.fromClient).toBe(true);
  });

  it("returns null when there are no messages", () => {
    expect(latestMessagePreview([])).toBeNull();
  });
});
